-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Ítems 8/9: las listas "Solicitudes en curso/realizadas" deben mostrar
-- "las conversiones obtenidas en la calculadora" al momento del envío, no
-- recalculadas con la tasa BCV del día en que se consulta la lista.
alter table solicitudes
  add column if not exists monto_usd_bcv numeric,
  add column if not exists monto_eur_bcv numeric;
