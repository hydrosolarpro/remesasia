-- Si un cliente fue eliminado antes (borrado lógico: usuarios.eliminado_at)
-- y su cuenta de auth sobrevivió al intento de borrado en el edge function
-- `eliminar-cliente` (esa función borra el auth.users por separado y solo
-- deja constancia en logs si falla, sin revertir el borrado lógico -- ver
-- supabase/functions/eliminar-cliente/index.ts), al volver a entrar con la
-- MISMA cuenta de Google y canjear un enlace de invitación de cliente,
-- canjear_invitacion() reutiliza esa misma fila de `usuarios` (mismo
-- auth.uid()) y actualiza negocio_operador_peru_id /
-- invitado_por_operador_miembro_id correctamente, pero nunca limpiaba
-- `eliminado_at` -- el cliente quedaba bien atribuido pero seguía marcado
-- como eliminado, invisible en "Clientes registrados" (que filtra
-- `eliminado_at is null`, ver app/app/(operador-peru)/clientes.tsx).
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
  v_plan_negocio text;
begin
  select rol into v_rol_actual from usuarios where id = auth.uid();

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
