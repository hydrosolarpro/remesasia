-- El operador Venezuela puede subir varias imágenes al validar el
-- depósito transferido en Venezuela (antes solo 1) -- se agrega un array
-- y se migran los datos existentes. El parámetro de comprobante del RPC
-- cambia de un solo texto a un array: se elimina la firma anterior antes
-- de recrear la función para no dejar dos versiones sobrecargadas (mismo
-- bug que motivó 0016_fix_validar_deposito_ve_overload.sql).

alter table solicitudes add column comprobante_vz_urls text[] not null default '{}';

update solicitudes
  set comprobante_vz_urls = array[comprobante_vz_url]
  where comprobante_vz_url is not null and comprobante_vz_url <> '';

drop function if exists validar_deposito_venezuela(uuid, text);

create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_urls text[] default null)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_miembro_id uuid;
  v_ve_id uuid;
  v_comision_peru numeric := 0;
  v_comision_ve numeric := 0;
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  select operador_peru_miembro_id into v_miembro_id
    from solicitudes where id = p_solicitud_id;

  if v_miembro_id is not null then
    select comision_pct, operador_venezuela_id into v_comision_peru, v_ve_id
      from operador_peru_miembro where id = v_miembro_id;

    if v_ve_id is not null then
      select comision_pct into v_comision_ve
        from operador_venezuela_perfil where id = v_ve_id;
    end if;
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_urls = coalesce(p_comprobante_urls, comprobante_vz_urls),
        validado_ve_por = auth.uid(),
        comision_peru_pct_aplicada = coalesce(comision_peru_pct_aplicada, v_comision_peru),
        comision_venezuela_pct_aplicada = coalesce(comision_venezuela_pct_aplicada, v_comision_ve)
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

grant execute on function validar_deposito_venezuela(uuid, text[]) to authenticated;
