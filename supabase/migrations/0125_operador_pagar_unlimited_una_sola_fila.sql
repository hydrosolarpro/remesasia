-- operador_pagar_unlimited reactivaba TODAS las solicitudes UNLIMITED rechazadas
-- del operador en un solo UPDATE. Con dos o más rechazadas (con tarifa fijada)
-- las dejaba todas en 'pendiente' a la vez y chocaba con el índice único
-- cambios_plan_pendientes_operador_abierto_key ("duplicate key value violates
-- unique constraint"), así que el comprobante nunca se guardaba.
--
-- Ahora solo se reactiva la solicitud más reciente.

create or replace function operador_pagar_unlimited(p_comprobante_url text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
      where id = (
        select id from cambios_plan_pendientes
        where operador_peru_id = auth.uid()
          and plan_solicitado = 'unlimited'
          and monto_por_definir = false
          and activado_at is null
          and (estado = 'rechazado' or (estado = 'pendiente' and comprobante_url is null))
        order by created_at desc
        limit 1
      );
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
