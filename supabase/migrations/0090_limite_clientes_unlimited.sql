-- El plan UNLIMITED, además del monto, tiene un cupo de clientes
-- acordado caso por caso (no es literalmente "ilimitado" en la práctica
-- del negocio). El Operador Perú lo solicita al consultar el plan
-- (ver SolicitudUnlimited), el admin lo fija junto con el monto
-- (admin_fijar_precio_unlimited), y queda guardado en `usuarios` una vez
-- activado -- ver obtenerLimitesPlan en lib/plan.ts, que usa este valor
-- en vez de Infinity cuando está definido.
alter table usuarios add column limite_clientes_unlimited integer;
alter table pagos_suscripcion add column limite_clientes integer;
alter table cambios_plan_pendientes add column limite_clientes integer;

-- admin_fijar_precio_unlimited: agrega el parámetro del cupo de clientes,
-- guardándolo junto con el monto en la misma fila (pagos_suscripcion si
-- está en DEMO, cambios_plan_pendientes si ya tiene plan pagado).
create or replace function admin_fijar_precio_unlimited(p_operador_id uuid, p_monto numeric, p_limite_clientes integer) returns jsonb
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
  if p_limite_clientes is not null and p_limite_clientes <= 0 then
    raise exception 'Límite de clientes inválido';
  end if;

  select plan into v_plan from usuarios where id = p_operador_id and rol = 'operador_peru';
  if v_plan is null then
    raise exception 'El id no corresponde a un Operador principal de Perú';
  end if;

  if v_plan = 'demo' then
    insert into pagos_suscripcion (operador_peru_id, periodo, monto, monto_por_definir, limite_clientes, estado, comprobante_url)
    values (p_operador_id, to_char(now(), 'YYYY-MM'), p_monto, false, p_limite_clientes, 'pendiente', null)
    on conflict (operador_peru_id, periodo)
    do update set monto = excluded.monto, monto_por_definir = false, limite_clientes = excluded.limite_clientes, estado = 'pendiente', comprobante_url = null;
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
        set monto = p_monto, monto_por_definir = false, limite_clientes = p_limite_clientes, estado = 'pendiente', comprobante_url = null
        where id = v_cambio_id;
    else
      insert into cambios_plan_pendientes (operador_peru_id, plan_solicitado, monto, monto_por_definir, limite_clientes, estado)
      values (p_operador_id, 'unlimited', p_monto, false, p_limite_clientes, 'pendiente');
    end if;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function admin_fijar_precio_unlimited(uuid, numeric, integer) to authenticated;

-- admin_validar_cambio_plan: al activar (de inmediato), copia el cupo de
-- clientes acordado a usuarios.limite_clientes_unlimited -- sin esto, un
-- cambio a UNLIMITED con cupo acordado activaba el plan pero el cupo
-- quedaba sin guardar en ningún lado visible para el operador.
create or replace function admin_validar_cambio_plan(p_cambio_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cambio cambios_plan_pendientes;
  v_usuario usuarios;
begin
  if rol_actual() <> 'administrador' then
    raise exception 'Solo el administrador puede validar cambios de plan';
  end if;

  select * into v_cambio from cambios_plan_pendientes
    where id = p_cambio_id and estado = 'pendiente' for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Solicitud no encontrada o ya procesada.');
  end if;

  select * into v_usuario from usuarios where id = v_cambio.operador_peru_id for update;

  update cambios_plan_pendientes
    set estado = 'verificado', verificado_por = auth.uid(), verificado_at = now()
    where id = p_cambio_id;

  if v_usuario.plan = 'demo' or v_usuario.plan_inicio is null
     or v_usuario.plan_inicio + interval '30 days' <= now() then
    update usuarios
      set plan = v_cambio.plan_solicitado,
          plan_inicio = now(),
          acceso_concedido = true,
          limite_clientes_unlimited = case when v_cambio.plan_solicitado = 'unlimited' then v_cambio.limite_clientes else limite_clientes_unlimited end
      where id = v_cambio.operador_peru_id;
    update cambios_plan_pendientes set activado_at = now() where id = p_cambio_id;
    return jsonb_build_object('ok', true, 'modo', 'inmediato');
  else
    return jsonb_build_object('ok', true, 'modo', 'encolado');
  end if;
end;
$$;

-- activar_planes_encolados: mismo ajuste para los cambios que se activan
-- solos al terminar el ciclo actual (cron).
create or replace function activar_planes_encolados() returns void
language plpgsql security definer set search_path = public as $$
begin
  with vencidos as (
    select c.id as cambio_id, c.operador_peru_id, c.plan_solicitado, c.limite_clientes
    from cambios_plan_pendientes c
    join usuarios u on u.id = c.operador_peru_id
    where c.estado = 'verificado' and c.activado_at is null
      and u.plan_inicio is not null and u.plan_inicio + interval '30 days' <= now()
  ),
  upd as (
    update usuarios u
      set plan = v.plan_solicitado,
          plan_inicio = u.plan_inicio + interval '30 days',
          limite_clientes_unlimited = case when v.plan_solicitado = 'unlimited' then v.limite_clientes else u.limite_clientes_unlimited end
    from vencidos v where u.id = v.operador_peru_id returning u.id
  )
  update cambios_plan_pendientes c set activado_at = now()
    from vencidos v where c.id = v.cambio_id;
end;
$$;
