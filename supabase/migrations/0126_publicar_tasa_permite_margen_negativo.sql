-- El Operador principal puede guardar la tasa del día aunque la tasa de venta
-- no sea menor que la de adquisición (la app solo avisa con el margen bruto en
-- rojo). Antes el servidor la rechazaba (migración 0104).

create or replace function publicar_tasa_del_dia(
  p_fecha date,
  p_tasa_pen_ves numeric,
  p_tasa_adquisicion numeric default null,
  p_corredor text default 'PE-VE'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal puede publicar la tasa del día';
  end if;

  if p_tasa_pen_ves is null or p_tasa_pen_ves <= 0 then
    raise exception 'La tasa de venta debe ser mayor que 0';
  end if;

  if not corredor_activo_negocio(auth.uid(), p_corredor) then
    raise exception 'Tu negocio no tiene activo el corredor %', p_corredor;
  end if;

  delete from tasas
    where fecha = p_fecha and publicada_por = auth.uid()
      and operador_peru_miembro_id is null and corredor = p_corredor;
  insert into tasas (fecha, tasa_pen_ves, tasa_adquisicion, publicada_por, corredor)
  values (p_fecha, p_tasa_pen_ves, p_tasa_adquisicion, auth.uid(), p_corredor);
end;
$$;
