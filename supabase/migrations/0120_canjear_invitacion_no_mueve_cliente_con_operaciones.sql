-- Un cliente que ya tiene operaciones en un negocio no puede ser movido a
-- otro negocio al canjear una invitación distinta (se perdía su historial
-- y su vínculo con el operador principal, p. ej. tras vencer un plan).
-- Si el cliente fue dado de baja (eliminado_at) se mantiene el comportamiento
-- anterior: puede registrarse de nuevo en otro negocio.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
  v_negocio_actual uuid;
  v_eliminado_at timestamptz;
  v_plan_negocio text;
  v_limite_medida int;
  v_tope int;
begin
  select rol, negocio_operador_peru_id, eliminado_at into v_rol_actual, v_negocio_actual, v_eliminado_at from usuarios where id = auth.uid();

  if v_rol_actual = 'administrador' then
    return jsonb_build_object('ok', false, 'error', 'Tu cuenta ya es administrador, no puede canjear invitaciones.');
  end if;

  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  if inv.tipo = 'cliente' and v_rol_actual is not null and v_rol_actual <> 'cliente' then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'rol_distinto',
      'error', 'Esta cuenta ya está registrada como ' || v_rol_actual || '. Cierra sesión y continúa con otra cuenta de Google para registrarte como cliente nuevo.'
    );
  end if;

  if inv.tipo = 'cliente' and v_rol_actual = 'cliente'
     and v_negocio_actual is not null
     and v_negocio_actual is distinct from inv.negocio_operador_peru_id
     and v_eliminado_at is null
     and exists (select 1 from solicitudes where cliente_id = auth.uid() and negocio_operador_peru_id = v_negocio_actual) then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'cliente_con_operaciones',
      'error', 'Esta cuenta ya tiene operaciones con otro operador. Para registrarte con este negocio usa otra cuenta de Google.'
    );
  end if;

  if inv.tipo = 'operador_peru' then
    update usuarios
      set rol = 'operador_peru',
          acceso_concedido = (inv.prospecto_id is not null),
          demo_inicio = now()
      where id = auth.uid();
  elsif v_rol_actual = 'cliente' and v_negocio_actual is not null and v_negocio_actual = inv.negocio_operador_peru_id then
    if v_eliminado_at is not null then
      update usuarios
        set eliminado_at = null,
            invitado_por_operador_miembro_id = inv.operador_peru_miembro_id,
            telefono = ''
        where id = auth.uid();
    else
      update usuarios set eliminado_at = null where id = auth.uid();
    end if;
  else
    if inv.negocio_operador_peru_id is not null then
      select count(*) into v_total_clientes
        from usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente' and eliminado_at is null;

      select plan, limite_clientes_unlimited into v_plan_negocio, v_limite_medida
        from usuarios where id = inv.negocio_operador_peru_id;

      if v_plan_negocio in ('medida', 'unlimited') then
        v_tope := coalesce(v_limite_medida, 2147483647);
      else
        v_tope := limite_clientes_plan(v_plan_negocio);
      end if;

      if v_total_clientes >= v_tope then
        return jsonb_build_object('ok', false, 'error', 'Este negocio ya alcanzó su límite de ' || v_tope || ' clientes de su plan actual.');
      end if;
    end if;

    update usuarios
      set rol = 'cliente',
          negocio_operador_peru_id = inv.negocio_operador_peru_id,
          invitado_por_operador_miembro_id = inv.operador_peru_miembro_id,
          eliminado_at = null,
          telefono = case when v_eliminado_at is not null then '' else telefono end
      where id = auth.uid();
  end if;

  if inv.tipo <> 'cliente' then
    update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;
  end if;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;

grant execute on function canjear_invitacion(text) to authenticated;
