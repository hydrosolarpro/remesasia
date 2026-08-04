-- Backfill: aplicada en producción el 2026-07-25 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- El bucket "comprobantes" no tenía ninguna política SELECT en
-- storage.objects. Cuando storage-api hace INSERT ... RETURNING para
-- subir un archivo, Postgres también exige que el usuario pueda "ver"
-- (SELECT) la fila recién insertada bajo RLS; sin esa política, la
-- relectura implícita fallaba con el mismo error genérico de RLS aunque
-- el INSERT en sí estuviera permitido. El bucket ya es público, así que
-- basta con permitir lectura a cualquier usuario autenticado con rol.
create policy "comprobantes: lectura autenticada"
  on storage.objects for select
  using (bucket_id = 'comprobantes' and rol_actual() is not null);
