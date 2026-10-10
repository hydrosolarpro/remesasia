-- Hardening a partir de los advisories de seguridad de Supabase tras el primer deploy.

-- ─────────────────────────────────────────────────────────────
-- search_path fijo en funciones sin `set search_path` (evita hijacking
-- vía manipulación del search_path de la sesión). `rol_actual()` ya lo
-- tenía desde 0002_rls.sql.
-- ─────────────────────────────────────────────────────────────
alter function set_updated_at() set search_path = public;
alter function validar_transicion_estado() set search_path = public;
alter function handle_new_user() set search_path = public;
alter function notificar_y_generar_comprobante() set search_path = public;

-- ─────────────────────────────────────────────────────────────
-- comprobantes: la policy de lectura pública en storage.objects permite
-- listar (storage.list()) todos los archivos del bucket a cualquiera con
-- la anon key, exponiendo comprobantes de pago de todos los clientes.
-- El bucket ya es público (`public = true`), así que `getPublicUrl()` por
-- ruta conocida sigue funcionando sin esta policy — el código de la app
-- solo usa getPublicUrl(), nunca list().
-- ─────────────────────────────────────────────────────────────
drop policy "comprobantes: lectura pública" on storage.objects;
