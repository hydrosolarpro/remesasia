-- ─────────────────────────────────────────────────────────────
-- 0127 — Protección de datos personales (Ley 29733): primer endurecimiento.
--
-- 1) usuarios: un CLIENTE podía leer las filas de todos los demás clientes
--    de su mismo negocio (nombre, teléfono, correo, número y foto del
--    documento). La policy "mismo negocio" comparaba
--    negocio_operador_peru_id = mi_negocio_operador_peru_id(), y para un
--    cliente esa función devuelve el negocio al que pertenece, así que
--    coincidía con todos sus compañeros. Ahora esa cláusula solo aplica a
--    operadores. El cliente sigue viendo su propia fila y la del Operador
--    principal de su negocio (id = mi_negocio_operador_peru_id()).
--
-- 2) documentos-identidad: policy de lectura por ruta firmada (createSignedUrl)
--    para preparar el paso del bucket a privado (0128): el dueño, el
--    administrador y los operadores del mismo negocio.
--
-- 3) Se elimina la policy de prueba "zzz test insert".
-- ─────────────────────────────────────────────────────────────
drop policy if exists "usuarios: acceso dentro del mismo negocio o admin" on usuarios;

create policy "usuarios: acceso dentro del mismo negocio o admin"
  on usuarios for select
  using (
    rol_actual() = 'administrador'
    or id = mi_negocio_operador_peru_id()
    or (
      rol_actual() in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela')
      and negocio_operador_peru_id = mi_negocio_operador_peru_id()
    )
  );

create policy "documentos-identidad: lectura dueno, operadores del negocio y admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos-identidad'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or rol_actual() = 'administrador'
      or (
        rol_actual() in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela')
        and exists (
          select 1
          from public.usuarios u
          where u.id::text = (storage.foldername(name))[1]
            and u.negocio_operador_peru_id = mi_negocio_operador_peru_id()
        )
      )
    )
  );

drop policy if exists "zzz test insert" on storage.objects;
