-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

drop policy if exists "comprobantes: operadores suben comprobante VZ / comprobante PDF" on storage.objects;
create policy "comprobantes: operadores suben comprobante VZ / comprobante PDF"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes' and rol_actual() = ANY (ARRAY['operador_peru'::rol, 'operador_peru_miembro'::rol, 'operador_venezuela'::rol]));

drop policy if exists "comprobantes: operadores actualizan cualquier archivo" on storage.objects;
create policy "comprobantes: operadores actualizan cualquier archivo"
  on storage.objects for update
  using (bucket_id = 'comprobantes' and rol_actual() = ANY (ARRAY['operador_peru'::rol, 'operador_peru_miembro'::rol, 'operador_venezuela'::rol]));
