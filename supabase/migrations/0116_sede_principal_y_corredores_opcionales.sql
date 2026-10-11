-- CORREDORES (fase 3, paso 5): el operador principal fija su SEDE PRINCIPAL
-- (el corredor desde el cual ve su dashboard por defecto, con acceso a los
-- datos de todos sus corredores) y puede trabajar solo 1 o 2 pares de
-- países -- incluso sin Perú-Venezuela -- y agregar otros más adelante.
--
-- 1) es_sede: a lo más UN corredor por negocio es la sede principal.
alter table negocio_corredores
  add column if not exists es_sede boolean not null default false;

create unique index if not exists negocio_corredores_una_sede
  on negocio_corredores (negocio_id) where es_sede;

-- Los negocios existentes tienen su sede en Perú-Venezuela.
update negocio_corredores set es_sede = true
where corredor = 'PE-VE'
  and not exists (
    select 1 from negocio_corredores x where x.negocio_id = negocio_corredores.negocio_id and x.es_sede
  );

-- 2) Una solicitud solo puede crearse en un corredor ACTIVO del negocio.
--    Antes 'PE-VE' no se validaba; ahora, si el negocio tiene la fila de
--    Perú-Venezuela DESACTIVADA, tampoco se acepta. Sin fila = comportamiento
--    histórico (se acepta), para no afectar a nadie que no la haya tocado.
create or replace function validar_corredor_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_activo boolean;
begin
  select activo into v_activo
    from negocio_corredores
    where negocio_id = new.negocio_operador_peru_id and corredor = new.corredor;

  if new.corredor = 'PE-VE' and v_activo is null then
    return new;  -- histórico: sin fila no se valida
  end if;

  if v_activo is distinct from true then
    raise exception 'Este negocio no tiene activo el corredor %', new.corredor;
  end if;
  return new;
end;
$$;

-- 3) Las RPC de tasa tampoco aceptan un corredor desactivado (incluido Perú).
create or replace function corredor_activo_negocio(p_negocio uuid, p_corredor text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from negocio_corredores where negocio_id = p_negocio and corredor = p_corredor)
      then (select activo from negocio_corredores where negocio_id = p_negocio and corredor = p_corredor)
    else p_corredor = 'PE-VE'
  end;
$$;

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

grant execute on function publicar_tasa_del_dia(date, numeric, numeric, text) to authenticated;
