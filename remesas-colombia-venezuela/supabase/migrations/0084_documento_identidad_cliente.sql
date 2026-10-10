-- ─────────────────────────────────────────────────────────────
-- 0084 — Documento de identidad del cliente: obligatorio antes de su
-- primera solicitud de remesa. Se completa en Perfil, justo después del
-- país (ver app/(cliente)/perfil.tsx). El gate que bloquea "Nueva
-- solicitud" hasta completarlo vive en app/(cliente)/index.tsx.
--
-- Los datos de quién lo recomendó (referido) son opcionales -- no es el
-- sistema de invitaciones por enlace (invitado_por_operador_miembro_id),
-- es solo información de contacto que el cliente puede dejar de palabra.
--
-- Al ser columnas de `usuarios`, ya son visibles para el Operador
-- principal y para el Operador de Perú miembro que atiende a ese cliente
-- (mismas policies de 0002_rls.sql / 0051_equipos_operadores.sql, sin
-- cambios necesarios acá).
-- ─────────────────────────────────────────────────────────────
alter table usuarios add column if not exists documento_tipo text;
alter table usuarios add column if not exists documento_numero text;
alter table usuarios add column if not exists documento_imagen_url text;
alter table usuarios add column if not exists referido_nombre text;
alter table usuarios add column if not exists referido_apellido text;
alter table usuarios add column if not exists referido_telefono text;

alter table usuarios add constraint usuarios_documento_tipo_check
  check (documento_tipo is null or documento_tipo in ('DNI', 'CE', 'PASAPORTE', 'CPP', 'PPT', 'CI'));

-- Bucket de documentos de identidad: mismo patrón que "comprobantes"
-- (0004_storage.sql, con el hardening de 0006_hardening.sql) -- público
-- para servir la imagen por URL directa (getPublicUrl), sin policy de
-- lectura/listado para no exponer el listado completo con la anon key.
insert into storage.buckets (id, name, public)
values ('documentos-identidad', 'documentos-identidad', true)
on conflict (id) do nothing;

create policy "documentos-identidad: cliente sube su propio documento"
  on storage.objects for insert
  with check (
    bucket_id = 'documentos-identidad'
    and rol_actual() = 'cliente'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documentos-identidad: cliente reemplaza su propio documento"
  on storage.objects for update
  using (
    bucket_id = 'documentos-identidad'
    and rol_actual() = 'cliente'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
