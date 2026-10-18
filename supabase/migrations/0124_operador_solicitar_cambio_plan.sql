-- Solicitar un cambio/renovación de plan con comprobante ya no choca con una
-- solicitud abierta que nunca se pagó.
--
-- Hay un índice único (cambios_plan_pendientes_operador_abierto_key): solo una
-- solicitud abierta por operador. Si el operador dejó una solicitud sin
-- comprobante (p. ej. un UNLIMITED consultado o con tarifa fijada que nunca
-- pagó) y luego elige otro plan, el INSERT fallaba con "duplicate key value
-- violates unique constraint" y no se guardaba el comprobante.
--
-- Esta función descarta (estado 'rechazado') las solicitudes abiertas del
-- operador que no tienen comprobante y luego crea la nueva. Una solicitud con
-- comprobante (en revisión) o ya verificada y en cola NO se toca: en ese caso
-- sigue apareciendo el aviso de que ya hay una solicitud en curso.

create or replace function operador_solicitar_cambio_plan(
  p_plan text,
  p_monto numeric,
  p_comprobante_url text,
  p_plan_a_medida boolean default false,
  p_limite_clientes integer default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el operador principal puede solicitar un cambio de plan';
  end if;
  if coalesce(trim(p_comprobante_url), '') = '' then
    raise exception 'Falta el comprobante';
  end if;

  update cambios_plan_pendientes
    set estado = 'rechazado'
    where operador_peru_id = auth.uid()
      and estado = 'pendiente'
      and comprobante_url is null
      and activado_at is null;

  if exists (
    select 1 from cambios_plan_pendientes
    where operador_peru_id = auth.uid() and estado <> 'rechazado' and activado_at is null
  ) then
    raise exception 'Ya tienes una solicitud de renovación/cambio de plan en curso.';
  end if;

  insert into cambios_plan_pendientes (operador_peru_id, plan_solicitado, monto, comprobante_url, estado, plan_a_medida, limite_clientes)
  values (auth.uid(), p_plan, p_monto, p_comprobante_url, 'pendiente', coalesce(p_plan_a_medida, false), p_limite_clientes);
end;
$$;

grant execute on function operador_solicitar_cambio_plan(text, numeric, text, boolean, integer) to authenticated;
