-- ─────────────────────────────────────────────────────────────
-- 0082 — eliminar_operador_peru seguía fallando, ahora con
-- "violates foreign key constraint solicitudes_validado_peru_por_fkey":
-- una `solicitud` de OTRO negocio fue validada alguna vez por una cuenta
-- que se está borrando (mismo patrón que 0079/0080 con invitaciones y
-- operador_peru_miembro). En vez de seguir acotando por negocio, esta
-- versión desvincula CUALQUIER solicitud -- de cualquier negocio -- que
-- referencie a una cuenta o miembro que se va a borrar, columna por
-- columna, conservando el resto de la fila (montos, fechas,
-- comprobantes) intacto.
-- ─────────────────────────────────────────────────────────────
create or replace function eliminar_operador_peru(p_operador_id uuid) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare
  v_miembro_ids uuid[];
  v_miembro_usuario_ids uuid[];
  v_ve_perfil_ids uuid[];
  v_ve_usuario_ids uuid[];
  v_cliente_ids uuid[];
  v_usuarios_a_borrar uuid[];
begin
  if rol_actual() <> 'administrador' then
    raise exception 'Solo un administrador puede eliminar un Operador de Perú';
  end if;

  if not exists (select 1 from usuarios where id = p_operador_id and rol = 'operador_peru') then
    raise exception 'El id no corresponde a un Operador principal de Perú';
  end if;

  -- Recolectar todo lo que depende de este negocio ANTES de tocar nada.
  v_miembro_ids := array(select id from operador_peru_miembro where operador_peru_id = p_operador_id);
  v_miembro_usuario_ids := array(select usuario_id from operador_peru_miembro where operador_peru_id = p_operador_id and usuario_id is not null);
  v_ve_perfil_ids := array(select id from operador_venezuela_perfil where operador_peru_id = p_operador_id);
  v_ve_usuario_ids := array(select usuario_id from operador_venezuela_perfil where operador_peru_id = p_operador_id and usuario_id is not null);
  v_cliente_ids := array(select id from usuarios where rol = 'cliente' and negocio_operador_peru_id = p_operador_id);
  v_usuarios_a_borrar := v_cliente_ids || v_miembro_usuario_ids || v_ve_usuario_ids || array[p_operador_id];

  -- 1) Congelar nombre/teléfono/correo del cliente en CUALQUIER solicitud
  --    suya (de cualquier negocio) antes de romper el vínculo -- el
  --    historial de operaciones sigue siendo legible aunque la cuenta del
  --    cliente ya no exista.
  update solicitudes s
    set cliente_nombre_historico = u.nombre,
        cliente_telefono_historico = u.telefono,
        cliente_email_historico = u.email
    from usuarios u
    where s.cliente_id = u.id
      and s.cliente_id = any(v_cliente_ids);

  -- 2) Desvincular (sin borrar la fila) CUALQUIER solicitud -- de
  --    cualquier negocio -- que referencie a una cuenta o miembro que se
  --    va a borrar. Una solicitud de OTRO negocio puede tener aquí a este
  --    operador/miembro/VE como quien la validó alguna vez; se conserva
  --    la fila con todos sus montos y comprobantes, solo se corta esa
  --    referencia puntual.
  update solicitudes
    set cliente_id = case when cliente_id = any(v_cliente_ids) then null else cliente_id end,
        operador_peru_id = case when operador_peru_id = any(v_usuarios_a_borrar) then null else operador_peru_id end,
        operador_venezuela_id = case when operador_venezuela_id = any(v_usuarios_a_borrar) then null else operador_venezuela_id end,
        operador_peru_miembro_id = case when operador_peru_miembro_id = any(v_miembro_ids) then null else operador_peru_miembro_id end,
        validado_peru_por = case when validado_peru_por = any(v_usuarios_a_borrar) then null else validado_peru_por end,
        validado_ve_por = case when validado_ve_por = any(v_usuarios_a_borrar) then null else validado_ve_por end,
        revision_resuelta_por = case when revision_resuelta_por = any(v_usuarios_a_borrar) then null else revision_resuelta_por end,
        negocio_operador_peru_id = case when negocio_operador_peru_id = any(v_usuarios_a_borrar) then null else negocio_operador_peru_id end
    where cliente_id = any(v_cliente_ids)
       or operador_peru_id = any(v_usuarios_a_borrar)
       or operador_venezuela_id = any(v_usuarios_a_borrar)
       or operador_peru_miembro_id = any(v_miembro_ids)
       or validado_peru_por = any(v_usuarios_a_borrar)
       or validado_ve_por = any(v_usuarios_a_borrar)
       or revision_resuelta_por = any(v_usuarios_a_borrar)
       or negocio_operador_peru_id = any(v_usuarios_a_borrar);

  -- 3) Desvincular (sin borrar) los pagos de suscripción de este operador
  --    -- se conservan como registro contable.
  update pagos_suscripcion set operador_peru_id = null where operador_peru_id = p_operador_id;
  update pagos_suscripcion set verificado_por = null where verificado_por = any(v_usuarios_a_borrar);

  -- 4) Lo que no es historial financiero se borra directo: chat escrito
  --    por cualquiera de estas cuentas, tasas y invitaciones -- contra
  --    CUALQUIER fila, sin importar el negocio.
  delete from mensajes_chat where autor_id = any(v_usuarios_a_borrar);
  delete from tasas where publicada_por = any(v_usuarios_a_borrar) or operador_peru_miembro_id = any(v_miembro_ids);
  delete from invitaciones
    where negocio_operador_peru_id = p_operador_id
       or operador_peru_miembro_id = any(v_miembro_ids)
       or creado_por = any(v_usuarios_a_borrar)
       or usado_por = any(v_usuarios_a_borrar);

  -- 5) Red de seguridad amplia: cualquier fila (de cualquier negocio) que
  --    apunte a una cuenta o a un miembro que se va a borrar se
  --    desvincula en vez de bloquear el borrado.
  update cambios_plan_pendientes set verificado_por = null where verificado_por = any(v_usuarios_a_borrar);
  update prospectos set contactado_por = null where contactado_por = any(v_usuarios_a_borrar);
  update usuarios set negocio_operador_peru_id = null where negocio_operador_peru_id = p_operador_id and id <> all(v_usuarios_a_borrar);
  update usuarios set invitado_por_operador_miembro_id = null where invitado_por_operador_miembro_id = any(v_miembro_ids);

  -- 6) Cortar CUALQUIER vínculo de equipo (de este negocio o de cualquier
  --    otro) hacia las cuentas que se van a borrar, y la asignación
  --    cruzada VE de este negocio -- si no, esas FKs bloquean el borrado
  --    de `usuarios`.
  update operador_peru_miembro set usuario_id = null where usuario_id = any(v_usuarios_a_borrar);
  update operador_venezuela_perfil set usuario_id = null where usuario_id = any(v_usuarios_a_borrar);
  update operador_peru_miembro set operador_venezuela_id = null where operador_venezuela_id = any(v_ve_perfil_ids);

  -- 7) Borrar las cuentas: clientes, miembros de Perú y operadores de
  --    Venezuela de este negocio. El operador principal se borra al
  --    final, arrastrando en cascada perfil_negocio,
  --    cuentas_bancarias_operador, operador_peru_miembro,
  --    operador_venezuela_perfil, cierres_diarios_operador y
  --    cambios_plan_pendientes (ya sin referencias bloqueantes).
  delete from usuarios where id = any(v_cliente_ids);
  delete from usuarios where id = any(v_miembro_usuario_ids);
  delete from usuarios where id = any(v_ve_usuario_ids);
  delete from usuarios where id = p_operador_id;

  return v_usuarios_a_borrar;
end;
$$;
