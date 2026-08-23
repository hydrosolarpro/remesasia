-- Regresión del bug ya documentado en 0026_proteger_rol_admin_de_invitaciones:
-- las reescrituras posteriores de canjear_invitacion() (0028, 0038, 0039,
-- 0047, 0049, 0054, 0058, 0063, 0064, 0069) fueron agregando funcionalidad
-- pero se les fue perdiendo por el camino el blindaje "si ya es
-- administrador, no canjees nada". Efecto real detectado en producción:
-- productosaas2026@gmail.com (cuenta admin bootstrap) abrió su propio
-- enlace de invitación de Operador Perú y quedó con rol='operador_peru',
-- bloqueada fuera de su propio panel de administrador.

-- 1) Restaura la cuenta afectada.
update usuarios set rol = 'administrador' where email = 'productosaas2026@gmail.com';

-- 2) Reintroduce el blindaje sobre la versión vigente de canjear_invitacion
-- (la de 0069_canjear_invitacion_preserva_atribucion_cliente.sql), sin
-- cambiar ningún otro comportamiento.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
  v_negocio_actual uuid;
  v_plan_negocio text;
begin
  select rol, negocio_operador_peru_id into v_rol_actual, v_negocio_actual from usuarios where id = auth.uid();

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
    -- Ya es cliente registrado de este negocio: solo reactivar si estaba
    -- eliminado (borrado lógico), sin tocar su atribución de operador.
    update usuarios set eliminado_at = null where id = auth.uid();
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
