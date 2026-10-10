-- CORREDORES (fase 3, paso 1): la tasa del día se publica y se lee POR
-- CORREDOR. `tasas.corredor` ya existe (0112, default 'PE-VE'); acá las dos
-- RPCs de publicación reciben `p_corredor` (default 'PE-VE', así que las
-- llamadas actuales de Perú-Venezuela siguen funcionando igual).
--
-- Se reemplazan (drop + create) en vez de agregar una sobrecarga, porque
-- dos funciones con el mismo nombre harían ambigua la llamada por nombre
-- de parámetros desde PostgREST.
--
-- tasa_pen_ves = "unidades de VES por 1 unidad de la moneda de recepción
-- del corredor" (soles, pesos colombianos...). tasa_adquisicion igual.

drop function if exists publicar_tasa_del_dia(date, numeric, numeric);
drop function if exists publicar_tasa_miembro(date, numeric);

create or replace function publicar_tasa_del_dia(
  p_fecha date,
  p_tasa_pen_ves numeric,
  p_tasa_adquisicion numeric default null,
  p_corredor text default 'PE-VE'
)
returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal puede publicar la tasa del día';
  end if;

  if p_tasa_pen_ves is null or p_tasa_pen_ves <= 0 then
    raise exception 'La tasa de venta debe ser mayor que 0';
  end if;

  if p_tasa_adquisicion is not null and p_tasa_pen_ves >= p_tasa_adquisicion then
    raise exception
      'La tasa de venta (%) debe ser MENOR que la tasa de adquisición (%): si no, pierdes dinero en todas las operaciones.',
      p_tasa_pen_ves, p_tasa_adquisicion;
  end if;

  if p_corredor <> 'PE-VE' and not exists (
    select 1 from negocio_corredores where negocio_id = auth.uid() and corredor = p_corredor and activo
  ) then
    raise exception 'Tu negocio no tiene activo el corredor %', p_corredor;
  end if;

  delete from tasas
    where fecha = p_fecha and publicada_por = auth.uid()
      and operador_peru_miembro_id is null and corredor = p_corredor;
  insert into tasas (fecha, tasa_pen_ves, tasa_adquisicion, publicada_por, corredor)
  values (p_fecha, p_tasa_pen_ves, p_tasa_adquisicion, auth.uid(), p_corredor);
end;
$$;

create or replace function publicar_tasa_miembro(
  p_fecha date,
  p_tasa_pen_ves numeric,
  p_corredor text default 'PE-VE'
)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_miembro operador_peru_miembro;
  v_ta_principal numeric;
begin
  if rol_actual() <> 'operador_peru_miembro' then
    raise exception 'Solo un Operador de Perú miembro puede publicar su propia tasa';
  end if;

  select * into v_miembro from operador_peru_miembro where usuario_id = auth.uid();

  if v_miembro.id is null then
    raise exception 'No se encontró tu perfil de Operador de Perú miembro';
  end if;

  if not v_miembro.puede_editar_tasa then
    raise exception 'Tu Operador principal no te habilitó para editar tu propia Tasa del día';
  end if;

  if p_tasa_pen_ves is null or p_tasa_pen_ves <= 0 then
    raise exception 'La tasa de venta debe ser mayor que 0';
  end if;

  if p_corredor <> 'PE-VE' and not exists (
    select 1 from negocio_corredores
    where negocio_id = v_miembro.operador_peru_id and corredor = p_corredor and activo
  ) then
    raise exception 'Tu negocio no tiene activo el corredor %', p_corredor;
  end if;

  select tasa_adquisicion into v_ta_principal
    from tasas
    where publicada_por = v_miembro.operador_peru_id
      and operador_peru_miembro_id is null
      and corredor = p_corredor
    order by fecha desc, created_at desc
    limit 1;

  if v_ta_principal is not null and p_tasa_pen_ves >= v_ta_principal then
    raise exception
      'Tu tasa de venta (%) debe ser MENOR que la tasa de adquisición del negocio (%): si no, pierdes dinero en tus operaciones.',
      p_tasa_pen_ves, v_ta_principal;
  end if;

  delete from tasas
    where fecha = p_fecha and operador_peru_miembro_id = v_miembro.id and corredor = p_corredor;
  insert into tasas (fecha, tasa_pen_ves, publicada_por, operador_peru_miembro_id, corredor)
  values (p_fecha, p_tasa_pen_ves, auth.uid(), v_miembro.id, p_corredor);
end;
$$;

grant execute on function publicar_tasa_del_dia(date, numeric, numeric, text) to authenticated;
grant execute on function publicar_tasa_miembro(date, numeric, text) to authenticated;
