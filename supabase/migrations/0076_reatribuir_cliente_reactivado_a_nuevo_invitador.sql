-- 0069_canjear_invitacion_preserva_atribucion_cliente dejó de reescribir
-- la atribución (invitado_por_operador_miembro_id) de un cliente ya
-- registrado del mismo negocio, para que reabrir su MISMO enlace guardado
-- no deshiciera una reasignación posterior del principal (derivar_cliente).
-- Efecto secundario no intencionado: un cliente dado de baja (eliminado_at
-- no nulo) que se vuelve a registrar usando el enlace de OTRO operador
-- (un miembro distinto, o el principal) queda reactivado pero sigue
-- atribuido al operador ORIGINAL en vez de a quien lo volvió a invitar --
-- por eso no aparece en la lista de "Clientes" de quien lo invitó esta vez.
--
-- Distinción correcta: si el cliente sigue activo, reabrir su enlace no
-- debe tocar su atribución (comportamiento de 0069, se mantiene). Si
-- estaba dado de baja, el canje se trata como una alta nueva: se
-- reatribuye a la invitación que se está canjeando ahora mismo.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
  v_negocio_actual uuid;
  v_eliminado_at timestamptz;
  v_plan_negocio text;
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
    update usuarios set rol = 'operador_peru', acceso_concedido = false, demo_inicio = now() where id = auth.uid();
  elsif v_rol_actual = 'cliente' and v_negocio_actual is not null and v_negocio_actual = inv.negocio_operador_peru_id then
    if v_eliminado_at is not null then
      -- Estaba dado de baja: se trata como una alta nueva -- se reatribuye
      -- a quien lo volvió a invitar (el dueño de ESTE enlace), no se
      -- conserva la atribución anterior.
      update usuarios
        set eliminado_at = null,
            invitado_por_operador_miembro_id = inv.operador_peru_miembro_id
        where id = auth.uid();
    else
      -- Sigue activo: solo reabrió su mismo enlace guardado -- no tocar su
      -- atribución (ver 0069).
      update usuarios set eliminado_at = null where id = auth.uid();
    end if;
  else
    if inv.negocio_operador_peru_id is not null then
      select count(*) into v_total_clientes
        from usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente' and eliminado_at is null;

      select plan into v_plan_negocio from usuarios where id = inv.negocio_operador_peru_id;

      if v_total_clientes >= limite_clientes_plan(v_plan_negocio) then
        return jsonb_build_object('ok', false, 'error', 'Este negocio ya alcanzó su límite de ' || limite_clientes_plan(v_plan_negocio) || ' clientes de su plan actual.');
      end if;
    end if;

    update usuarios
      set rol = 'cliente',
          negocio_operador_peru_id = inv.negocio_operador_peru_id,
          invitado_por_operador_miembro_id = inv.operador_peru_miembro_id,
          eliminado_at = null
      where id = auth.uid();
  end if;

  if inv.tipo <> 'cliente' then
    update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;
  end if;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;
