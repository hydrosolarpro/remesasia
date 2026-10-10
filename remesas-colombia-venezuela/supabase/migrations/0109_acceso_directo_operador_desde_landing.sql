-- Acceso directo del operador principal de Perú que se registra desde la
-- landing ("Solicita Demo Gratis (7 Días)" -> "Finalizar y ver mi acceso").
--
-- registrar_prospecto() (0085/0087) ya crea una invitación 'operador_peru'
-- ligada al prospecto (invitaciones.prospecto_id). Pero canjear_invitacion
-- dejaba siempre acceso_concedido = false, o sea, el admin tenía que
-- "conceder el acceso" a mano en Panel de Control (y mientras tanto los
-- clientes del operador quedaban bloqueados por AccesoNegocioGate). Ahora,
-- si la invitación viene de la landing (prospecto_id no nulo), el acceso
-- queda concedido al canjearla. El resto del cuerpo es idéntico a 0106.

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

  if inv.tipo = 'operador_peru' then
    update usuarios
      set rol = 'operador_peru',
          -- Invitación generada por la landing (tiene prospecto_id): acceso
          -- directo, sin validación del admin. Las que crea el admin a mano
          -- siguen entrando con acceso_concedido = false.
          acceso_concedido = (inv.prospecto_id is not null),
          demo_inicio = now()
      where id = auth.uid();
  elsif v_rol_actual = 'cliente' and v_negocio_actual is not null and v_negocio_actual = inv.negocio_operador_peru_id then
    if v_eliminado_at is not null then
      update usuarios
        set eliminado_at = null,
            invitado_por_operador_miembro_id = inv.operador_peru_miembro_id,
            -- Registro nuevo: se le vuelve a pedir teléfono (y de paso
            -- nombre, ya editable en esa misma pantalla) -- ver
            -- app/(auth)/registro.tsx.
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
