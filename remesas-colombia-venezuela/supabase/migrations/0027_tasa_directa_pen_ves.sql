-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Simplifica el modelo de tasa: se elimina el paso intermedio por USDT
-- (tasa_pen_usdt / tasa_usdt_ves) y se reemplaza por una sola tasa directa
-- Soles -> Bolívares Soberanos. No había datos de producción en ese momento
-- (0 solicitudes reales), así que fue seguro hacer el cambio limpio.
--
-- operaciones_dashboard es una vista sin uso en la app (quedó del modelo
-- de ganancia anterior, antes de "rentabilidad_pct"; ningún archivo la
-- consulta), se elimina junto con las columnas de las que depende.
drop view if exists operaciones_dashboard;

alter table tasas add column if not exists tasa_pen_ves numeric not null default 0;
alter table tasas drop column if exists tasa_pen_usdt;
alter table tasas drop column if exists tasa_usdt_ves;
alter table tasas alter column tasa_pen_ves drop default;

alter table solicitudes add column if not exists tasa_pen_ves numeric;
update solicitudes set tasa_pen_ves = 0 where tasa_pen_ves is null;
alter table solicitudes alter column tasa_pen_ves set not null;
alter table solicitudes drop column if exists tasa_pen_usdt;
alter table solicitudes drop column if exists tasa_usdt_ves;
alter table solicitudes drop column if exists monto_usdt;
