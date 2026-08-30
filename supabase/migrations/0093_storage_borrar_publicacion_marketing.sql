-- ─────────────────────────────────────────────────────────────
-- 0093 — Automarketing: permitir al Operador principal de Perú BORRAR
-- las imágenes de sus publicaciones (bucket `comprobantes`, carpeta
-- `marketing/<su_id>/`).
--
-- El bucket `comprobantes` no tiene ninguna policy de DELETE (ver 0004 /
-- 0032: solo insert, update y select). Sin esto, al eliminar una
-- publicación desde "Publicaciones anteriores" se borra la fila de
-- `publicaciones_marketing` pero el archivo .jpg queda huérfano en Storage
-- y se acumula.
--
-- Se restringe a: rol operador_peru + primer segmento 'marketing' + segundo
-- segmento = su propio auth.uid() (así no puede tocar comprobantes de pago
-- ni archivos de marketing de otro negocio).
-- ─────────────────────────────────────────────────────────────

drop policy if exists "comprobantes: operador borra sus imagenes de marketing" on storage.objects;
create policy "comprobantes: operador borra sus imagenes de marketing"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'comprobantes'
    and rol_actual() = 'operador_peru'
    and (storage.foldername(name))[1] = 'marketing'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
