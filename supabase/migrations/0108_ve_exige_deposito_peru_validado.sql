-- Restringe la carga del comprobante / validación del depósito en
-- Venezuela: no se permite hasta que el depósito en soles ya haya sido
-- validado en Perú (check_deposito_peru) por el operador principal o su
-- equipo de operadores de Perú. Aplica a todos los roles que pueden
-- llamar a esta función (Venezuela, Perú principal y Perú miembro).
-- Copia de la versión de 0072 + la verificación nueva.

create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_urls text[] default null)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_miembro_id uuid;
  v_ve_id uuid;
  v_peru_ok boolean;
  v_comision_peru numeric := 0;
  v_comision_ve numeric := 0;
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  select operador_peru_miembro_id, check_deposito_peru into v_miembro_id, v_peru_ok
    from solicitudes
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();

  if not coalesce(v_peru_ok, false) then
    raise exception 'Primero debe validarse el depósito en soles en Perú. Hasta entonces no se puede cargar el comprobante de Venezuela.';
  end if;

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
