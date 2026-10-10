-- El check "depósito efectuado en Venezuela" ahora también puede llevar
-- la foto del comprobante que sube el Operador Venezuela (o el Operador
-- Perú si es el mismo). create or replace con una lista de parámetros
-- distinta deja las DOS versiones de la función (sobrecarga) en vez de
-- reemplazar — por eso se borra la de un solo parámetro antes.
drop function if exists validar_deposito_venezuela(uuid);

create function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_url text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_url = coalesce(p_comprobante_url, comprobante_vz_url)
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

grant execute on function validar_deposito_venezuela(uuid, text) to authenticated;
