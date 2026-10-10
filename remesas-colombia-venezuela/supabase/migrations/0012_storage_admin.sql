-- Backfill: aplicada en producción el 2026-07-24 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- El admin necesita subir el QR de Yape/Plin de su configuración de pagos.
create policy "comprobantes: admin sube y actualiza su configuración de pagos"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes' and rol_actual() = 'administrador');

create policy "comprobantes: admin actualiza su configuración de pagos"
  on storage.objects for update
  using (bucket_id = 'comprobantes' and rol_actual() = 'administrador');
