-- Backfill: aplicada en producción el 2026-07-31 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- La sesión de Operador Venezuela llama a obtenerMiembrosAsignadosAlVe(),
-- que filtra operador_peru_miembro por esta columna. No existía en
-- producción (aunque sí en el archivo local 0051, nunca aplicado), así que
-- esa consulta fallaba y el panel de Operador Venezuela no cargaba.
alter table operador_peru_miembro add column if not exists operador_venezuela_id uuid
  references operador_venezuela_perfil (id);

create index if not exists idx_opm_operador_venezuela on operador_peru_miembro (operador_venezuela_id);
