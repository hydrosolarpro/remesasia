-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- El ítem 8 del pedido pide, por cada cuenta bancaria del operador: titular
-- de la cuenta, n° de cuenta y CCI (hasta ahora solo había entidad + n° cuenta).
alter table cuentas_bancarias_operador
  add column if not exists titular text not null default '',
  add column if not exists cci text not null default '';
