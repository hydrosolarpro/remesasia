-- ─────────────────────────────────────────────────────────────
-- 0078 — El Administrador puede eliminar físicamente a un Operador
-- principal de Perú y todo su negocio (su equipo de Perú, sus operadores
-- de Venezuela y sus clientes), conservando el historial de operaciones
-- (`solicitudes`) y de pagos de suscripción (`pagos_suscripcion`) como
-- registro contable, desvinculado de cualquier cuenta activa.
--
-- Por eso `solicitudes.cliente_id` y `pagos_suscripcion.operador_peru_id`
-- pasan a admitir NULL: al eliminar las cuentas, esas filas se conservan
-- con sus montos, fechas y comprobantes intactos, solo pierden el vínculo
-- a una cuenta que ya no existe. El nombre/teléfono/correo del cliente se
-- "congela" en la propia solicitud antes de romper el vínculo, para que
-- el historial siga siendo legible.
-- ─────────────────────────────────────────────────────────────

alter table solicitudes alter column cliente_id drop not null;
alter table pagos_suscripcion alter column operador_peru_id drop not null;

alter table solicitudes add column if not exists cliente_nombre_historico text;
alter table solicitudes add column if not exists cliente_telefono_historico text;
alter table solicitudes add column if not exists cliente_email_historico text;

-- ─────────────────────────────────────────────────────────────
-- eliminar_operador_peru: borrado físico completo de un negocio de
-- Operador de Perú. Solo el administrador puede ejecutarla. Devuelve los
-- ids de TODAS las cuentas de auth.users que la Edge Function que la
-- invoca debe borrar (el operador, sus miembros de Perú, sus operadores
-- de Venezuela y sus clientes).
-- ─────────────────────────────────────────────────────────────
create or replace function eliminar_operador_peru(p_operador_id uuid) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare
  v_miembro_ids uuid[];
  v_miembro_usuario_ids uuid[];
  v_ve_usuario_ids uuid[];
  v_cliente_ids uuid[];
  v_solicitud_ids uuid[];
  v_ids_auth uuid[];
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
  --    -- se conservan como registro contable.
  update pagos_suscripcion set operador_peru_id = null where operador_peru_id = p_operador_id;

  -- 4) Lo que no es historial financiero se borra directo: chat de esas
  --    solicitudes, tasas publicadas por el negocio, invitaciones del
  --    negocio.
  delete from mensajes_chat where solicitud_id = any(v_solicitud_ids);
  delete from tasas where publicada_por = p_operador_id or operador_peru_miembro_id = any(v_miembro_ids);
  delete from invitaciones
    where negocio_operador_peru_id = p_operador_id
       or operador_peru_miembro_id = any(v_miembro_ids)
       or creado_por = p_operador_id
       or creado_por = any(v_miembro_usuario_ids)
       or creado_por = any(v_ve_usuario_ids)
       or usado_por = any(v_cliente_ids);

  -- 5) Red de seguridad: cualquier otra fila que por error apunte a un id
  --    que estamos por borrar se desvincula en vez de bloquear el borrado.
  update cambios_plan_pendientes set verificado_por = null where verificado_por = p_operador_id;
  update prospectos
    set contactado_por = null
    where contactado_por = p_operador_id
       or contactado_por = any(v_miembro_usuario_ids)
       or contactado_por = any(v_ve_usuario_ids);

  -- 6) Desvincular las filas de equipo de la cuenta real (usuario_id) y de
  --    su asignación cruzada (operador_venezuela_id) ANTES de borrar esas
  --    cuentas -- si no, esas FKs bloquearían el borrado de `usuarios`.
  update operador_peru_miembro set usuario_id = null, operador_venezuela_id = null where operador_peru_id = p_operador_id;
  update operador_venezuela_perfil set usuario_id = null where operador_peru_id = p_operador_id;

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

  v_ids_auth := v_cliente_ids || v_miembro_usuario_ids || v_ve_usuario_ids || array[p_operador_id];
  return v_ids_auth;
end;
$$;

grant execute on function eliminar_operador_peru(uuid) to authenticated;
