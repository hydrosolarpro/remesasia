-- ─────────────────────────────────────────────────────────────
-- 0081 — Blindaje completo de eliminar_operador_peru contra referencias
-- sueltas de cuentas que tuvieron otro rol/negocio antes (ya se
-- encontraron dos casos así: invitaciones.usado_por y
-- operador_peru_miembro.usuario_id apuntando fuera del negocio actual).
-- Esta versión cubre TODAS las columnas restantes que referencian
-- usuarios(id) u operador_peru_miembro(id) sin cascada, desvinculándolas
-- contra cualquier cuenta que se vaya a borrar, sin asumir que la
-- referencia vive dentro del mismo negocio:
--   - usuarios.negocio_operador_peru_id (auto-referencia)
--   - usuarios.invitado_por_operador_miembro_id
--   - pagos_suscripcion.verificado_por
-- ─────────────────────────────────────────────────────────────
create or replace function eliminar_operador_peru(p_operador_id uuid) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare
  v_miembro_ids uuid[];
  v_miembro_usuario_ids uuid[];
  v_ve_usuario_ids uuid[];
  v_cliente_ids uuid[];
  v_solicitud_ids uuid[];
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
  v_ve_usuario_ids := array(select usuario_id from operador_venezuela_perfil where operador_peru_id = p_operador_id and usuario_id is not null);
  v_cliente_ids := array(select id from usuarios where rol = 'cliente' and negocio_operador_peru_id = p_operador_id);
  v_solicitud_ids := array(select id from solicitudes where negocio_operador_peru_id = p_operador_id);
  v_usuarios_a_borrar := v_cliente_ids || v_miembro_usuario_ids || v_ve_usuario_ids || array[p_operador_id];

  -- 1) Congelar nombre/teléfono/correo del cliente en cada solicitud antes
  --    de romper el vínculo -- el historial de operaciones sigue siendo
  --    legible aunque la cuenta del cliente ya no exista.
  update solicitudes s
    set cliente_nombre_historico = u.nombre,
        cliente_telefono_historico = u.telefono,
        cliente_email_historico = u.email
    from usuarios u
    where s.cliente_id = u.id
      and s.id = any(v_solicitud_ids);

  -- 2) Desvincular (sin borrar) las solicitudes de este negocio: quedan
  --    como historial huérfano, intactas en montos, fechas y comprobantes.
  update solicitudes
    set cliente_id = null,
        operador_peru_id = null,
        operador_venezuela_id = null,
        negocio_operador_peru_id = null,
        operador_peru_miembro_id = null,
        validado_peru_por = null,
        validado_ve_por = null,
        revision_resuelta_por = null
    where id = any(v_solicitud_ids);

  -- 3) Desvincular (sin borrar) los pagos de suscripción de este operador
  --    -- se conservan como registro contable. El null de `verificado_por`
  --    es amplio (cualquier pago, no solo los de este operador) por si
  --    alguna cuenta a borrar quedó como verificadora de un pago ajeno.
  update pagos_suscripcion set operador_peru_id = null where operador_peru_id = p_operador_id;
  update pagos_suscripcion set verificado_por = null where verificado_por = any(v_usuarios_a_borrar);

  -- 4) Lo que no es historial financiero se borra directo: chat de esas
  --    solicitudes, tasas y invitaciones -- el match de `usado_por`/
  --    `creado_por`/`publicada_por` es contra CUALQUIER cuenta que se va
  --    a borrar, sin importar el negocio, para no dejar referencias
  --    colgando de cuentas que tuvieron otro rol antes.
  delete from mensajes_chat where solicitud_id = any(v_solicitud_ids);
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
  update operador_peru_miembro set operador_venezuela_id = null where operador_peru_id = p_operador_id;

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
