-- Al validar el depósito en Perú, la operación se envía automáticamente al
-- Operador Venezuela registrado en el perfil del Operador principal para su
-- atención.
--
-- Reglas:
--   * Si el principal ya derivó la operación a un VE (derivada_ve_perfil_id),
--     se respeta.
--   * Si la atiende un miembro de Perú que tiene un VE asignado
--     (operador_peru_miembro.operador_venezuela_id), ese VE ya la recibe: no
--     se pisa.
--   * En cualquier otro caso se deriva al VE del equipo del principal
--     (prefiriendo el que ya tiene su sesión vinculada, luego el más antiguo).

create or replace function validar_deposito_peru(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_negocio uuid := mi_negocio_operador_peru_id();
  v_miembro_id uuid;
  v_derivada uuid;
  v_ve_miembro uuid;
  v_ve_equipo uuid;
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro') then
    raise exception 'Solo el Operador Perú puede validar este depósito';
  end if;

  select operador_peru_miembro_id, derivada_ve_perfil_id
    into v_miembro_id, v_derivada
    from solicitudes
    where id = p_solicitud_id and negocio_operador_peru_id = v_negocio;

  if v_derivada is null then
    if v_miembro_id is not null then
      select operador_venezuela_id into v_ve_miembro
        from operador_peru_miembro where id = v_miembro_id;
    end if;

    if v_ve_miembro is null then
      select id into v_ve_equipo
        from operador_venezuela_perfil
        where operador_peru_id = v_negocio
        order by (usuario_id is not null) desc, created_at asc
        limit 1;
    end if;
  end if;

  update solicitudes
    set check_deposito_peru = true,
        check_deposito_peru_at = now(),
        validado_peru_por = auth.uid(),
        derivada_ve_perfil_id = coalesce(derivada_ve_perfil_id, v_ve_equipo)
    where id = p_solicitud_id and negocio_operador_peru_id = v_negocio;
end;
$$;

grant execute on function validar_deposito_peru(uuid) to authenticated;

-- Operaciones ya validadas en Perú y aún pendientes en Venezuela: se envían
-- al VE del equipo (solo si nadie las tenía asignadas).
update solicitudes s
  set derivada_ve_perfil_id = (
    select v.id from operador_venezuela_perfil v
    where v.operador_peru_id = s.negocio_operador_peru_id
    order by (v.usuario_id is not null) desc, v.created_at asc
    limit 1
  )
  where s.check_deposito_peru
    and not s.check_deposito_ve
    and s.derivada_ve_perfil_id is null
    and (
      s.operador_peru_miembro_id is null
      or not exists (
        select 1 from operador_peru_miembro m
        where m.id = s.operador_peru_miembro_id and m.operador_venezuela_id is not null
      )
    );
