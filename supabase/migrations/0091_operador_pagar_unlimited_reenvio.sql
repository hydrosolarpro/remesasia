-- operador_pagar_unlimited() exigía comprobante_url IS NULL para
-- encontrar la fila a actualizar -- eso funcionaba para el primer envío,
-- pero si el admin RECHAZA el pago (el depósito no llegó a la cuenta), la
-- fila queda con estado='rechazado' y su comprobante_url VIEJO todavía
-- puesto, así que un reenvío nunca encontraba fila que actualizar y
-- fallaba con "No hay una solicitud... esperando tu pago". Ahora también
-- acepta la fila si está 'rechazado' (sin importar su comprobante_url
-- anterior), y la deja lista para verificar de nuevo con el comprobante
-- nuevo.
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
      and (estado = 'rechazado' or (estado = 'pendiente' and comprobante_url is null));
  if found then
    v_actualizado := true;
  end if;

  if not v_actualizado then
    update cambios_plan_pendientes
      set comprobante_url = p_comprobante_url, estado = 'pendiente'
      where operador_peru_id = auth.uid()
        and plan_solicitado = 'unlimited'
        and monto_por_definir = false
        and activado_at is null
        and (estado = 'rechazado' or (estado = 'pendiente' and comprobante_url is null));
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
