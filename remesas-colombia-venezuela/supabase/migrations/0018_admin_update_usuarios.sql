-- El admin necesita poder marcar acceso_concedido en la fila de otros
-- usuarios (Operadores Perú) desde el panel de control.
create policy "usuarios: admin actualiza"
  on usuarios for update
  using (rol_actual() = 'administrador')
  with check (rol_actual() = 'administrador');
