-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

alter table solicitudes
  add column if not exists tipo_transferencia text not null default 'transferencia_bancaria'
    check (tipo_transferencia in ('transferencia_bancaria', 'pago_movil'));
