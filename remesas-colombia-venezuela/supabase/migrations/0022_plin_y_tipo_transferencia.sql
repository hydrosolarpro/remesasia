-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Ítem 9: "Forma de pago" debe incluir PLIN además de YAPE/Transferencia,
-- y las solicitudes deben indicar el tipo de transferencia usado hacia la
-- cuenta en Venezuela (transferencia bancaria o pago móvil).
alter type metodo_pago add value if not exists 'plin';
