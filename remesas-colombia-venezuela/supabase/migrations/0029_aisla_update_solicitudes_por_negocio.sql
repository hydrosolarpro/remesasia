-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Bug real de aislamiento: la política "solicitudes: Operador Perú
-- actualiza cualquiera" no filtraba por negocio, así que CUALQUIER
-- Operador Perú podía actualizar (en teoría, si algo llamara a un UPDATE
-- directo en vez de las RPC validar_deposito_*) solicitudes de OTRO
-- operador. Se agrega el mismo filtro por negocio que ya usa la política
-- de SELECT.
drop policy if exists "solicitudes: Operador Perú actualiza cualquiera" on solicitudes;
drop policy if exists "solicitudes: Operador Perú actualiza las de su negocio" on solicitudes;
create policy "solicitudes: Operador Perú actualiza las de su negocio"
  on solicitudes for update
  using (rol_actual() = 'operador_peru' and negocio_operador_peru_id = mi_negocio_operador_peru_id())
  with check (rol_actual() = 'operador_peru' and negocio_operador_peru_id = mi_negocio_operador_peru_id());
