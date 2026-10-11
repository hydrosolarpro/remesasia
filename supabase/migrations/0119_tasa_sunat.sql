-- Tipo de cambio SOLES/DÓLARES de SUNAT, actualizado por día. Lo carga la
-- Edge Function `sunat-tipo-cambio` (bajo demanda, con caché): fuente
-- https://www.sunat.gob.pe/a/txt/tipoCambio.txt ("dd/mm/aaaa|compra|venta|").
-- La app lo usa para mostrar el equivalente en dólares de los precios de los
-- planes (que están en soles).
create table if not exists tasa_sunat (
  fecha date primary key,            -- fecha del tipo de cambio publicada por SUNAT
  compra numeric(8, 4) not null check (compra > 0),
  venta numeric(8, 4) not null check (venta > 0),
  fetched_at timestamptz not null default now()
);

alter table tasa_sunat enable row level security;

-- Lectura para cualquier usuario autenticado; solo la Edge Function (service
-- role) escribe.
drop policy if exists "tasa_sunat: lectura" on tasa_sunat;
create policy "tasa_sunat: lectura" on tasa_sunat for select to authenticated using (true);
