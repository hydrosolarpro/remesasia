-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Los valores de enum deben confirmarse en su propia transacción antes de
-- poder usarse (restricción de Postgres), por eso va en una migración
-- aparte de todo lo que la usa.
alter type rol add value if not exists 'operador_peru_miembro';
