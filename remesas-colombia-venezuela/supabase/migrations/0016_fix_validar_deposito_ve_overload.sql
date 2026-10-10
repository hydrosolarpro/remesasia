-- Backfill: aplicada en producción el 2026-07-24 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- create or replace con una lista de parámetros distinta crea una función
-- sobrecargada nueva en vez de reemplazar la anterior — hay que borrar la
-- de un solo parámetro para evitar ambigüedad de sobrecarga.
drop function if exists validar_deposito_venezuela(uuid);
