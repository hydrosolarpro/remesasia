-- El flujo de UNLIMITED (admin fija el monto -> aparece en el Perfil del
-- operador -> paga con el formulario normal -> admin valida) necesitaba
-- hacer UPDATE directo sobre pagos_suscripcion/cambios_plan_pendientes
-- desde el cliente, pero sus políticas RLS solo cubren INSERT y el
-- UPDATE puntual de rechazar/reenviar -- no "admin fija monto sobre una
-- fila pendiente" ni "operador sube su comprobante sobre una fila ya
-- creada". El UPDATE quedaba bloqueado en silencio (0 filas afectadas,
-- sin error), así que el monto nunca le aparecía al operador. Se resuelve
-- con dos RPC security definer, mismo patrón que canjear_invitacion/
-- admin_validar_cambio_plan.

-- Admin fija (o corrige) el monto acordado de UNLIMITED para un operador,
-- sin conceder acceso -- deja la solicitud "pendiente" para que el
-- operador la pague con el formulario normal.
create or replace function admin_fijar_precio_unlimited(p_operador_id uuid, p_monto numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_cambio_id uuid;
  v_cambio_plan text;
begin
  if rol_actual() <> 'administrador' then
    raise exception 'Solo un administrador puede fijar el monto de UNLIMITED';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'Monto inválido';
  end if;

  select plan into v_plan from usuarios where id = p_operador_id and rol = 'operador_peru';
  if v_plan is null then
    raise exception 'El id no corresponde a un Operador principal de Perú';
  end if;

  if v_plan = 'demo' then
    insert into pagos_suscripcion (operador_peru_id, periodo, monto, monto_por_definir, estado, comprobante_url)
    values (p_operador_id, to_char(now(), 'YYYY-MM'), p_monto, false, 'pendiente', null)
    on conflict (operador_peru_id, periodo)
    do update set monto = excluded.monto, monto_por_definir = false, estado = 'pendiente', comprobante_url = null;
  else
    select id, plan_solicitado into v_cambio_id, v_cambio_plan
      from cambios_plan_pendientes
      where operador_peru_id = p_operador_id and estado <> 'rechazado' and activado_at is null
      limit 1;

    if v_cambio_id is not null and v_cambio_plan <> 'unlimited' then
      raise exception 'Este operador ya tiene una solicitud pendiente de %. Resuélvela antes de asignarle UNLIMITED.', v_cambio_plan;
    end if;

    if v_cambio_id is not null then
      update cambios_plan_pendientes
        set monto = p_monto, monto_por_definir = false, estado = 'pendiente', comprobante_url = null
        where id = v_cambio_id;
    else
      insert into cambios_plan_pendientes (operador_peru_id, plan_solicitado, monto, monto_por_definir, estado)
      values (p_operador_id, 'unlimited', p_monto, false, 'pendiente');
    end if;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function admin_fijar_precio_unlimited(uuid, numeric) to authenticated;

-- El operador principal envía su comprobante para la tarifa de UNLIMITED
-- ya fijada por el admin. Busca sola la fila correcta (pagos_suscripcion
-- si está en DEMO, cambios_plan_pendientes si ya tenía un plan pagado),
-- así el cliente (FormularioSolicitudPlan) no necesita saber en cuál de
-- las dos tablas vive.
create or replace function operador_pagar_unlimited(p_comprobante_url text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actualizado boolean := false;
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el operador principal puede enviar este pago';
  end if;
  if coalesce(trim(p_comprobante_url), '') = '' then
    raise exception 'Falta el comprobante';
  end if;

  update pagos_suscripcion
    set comprobante_url = p_comprobante_url, estado = 'pendiente'
    where operador_peru_id = auth.uid()
      and periodo = to_char(now(), 'YYYY-MM')
      and monto_por_definir = false
      and comprobante_url is null;
  if found then
    v_actualizado := true;
  end if;

  if not v_actualizado then
    update cambios_plan_pendientes
      set comprobante_url = p_comprobante_url, estado = 'pendiente'
      where operador_peru_id = auth.uid()
        and plan_solicitado = 'unlimited'
        and monto_por_definir = false
        and comprobante_url is null
        and estado <> 'rechazado'
        and activado_at is null;
    if found then
      v_actualizado := true;
    end if;
  end if;

  if not v_actualizado then
    raise exception 'No hay una solicitud de UNLIMITED con tarifa ya fijada esperando tu pago.';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function operador_pagar_unlimited(text) to authenticated;
