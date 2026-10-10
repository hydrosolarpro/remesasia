-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Ítem 13: el % de rentabilidad / ganancia debe poder compartirse o no con
-- el Operador Venezuela. Por defecto NO se comparte (dato sensible), el
-- operador Perú lo activa explícitamente.
alter table perfil_negocio
  add column if not exists compartir_rentabilidad_ve boolean not null default false;
