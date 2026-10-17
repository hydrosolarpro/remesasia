-- La tasa especial del día por cliente también la puede fijar un Operador de
-- Perú miembro, pero solo para los clientes que él invitó. El principal sigue
-- pudiendo con todos los clientes de su negocio.
create or replace function puede_gestionar_tasa_cliente(p_negocio uuid, p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    (p_negocio = auth.uid() and exists (
       select 1 from usuarios c where c.id = p_cliente and c.rol = 'cliente' and c.negocio_operador_peru_id = p_negocio))
    or
    exists (
       select 1
       from operador_peru_miembro m
       join usuarios c on c.invitado_por_operador_miembro_id = m.id
       where m.usuario_id = auth.uid()
         and m.operador_peru_id = p_negocio
         and c.id = p_cliente and c.rol = 'cliente' and c.negocio_operador_peru_id = p_negocio);
$$;

drop policy "tasas_cliente: principal inserta" on tasas_cliente;
drop policy "tasas_cliente: principal actualiza" on tasas_cliente;
drop policy "tasas_cliente: principal borra" on tasas_cliente;

create policy "tasas_cliente: operador inserta" on tasas_cliente
  for insert with check (puede_gestionar_tasa_cliente(negocio_operador_peru_id, cliente_id));
create policy "tasas_cliente: operador actualiza" on tasas_cliente
  for update using (puede_gestionar_tasa_cliente(negocio_operador_peru_id, cliente_id))
  with check (puede_gestionar_tasa_cliente(negocio_operador_peru_id, cliente_id));
create policy "tasas_cliente: operador borra" on tasas_cliente
  for delete using (puede_gestionar_tasa_cliente(negocio_operador_peru_id, cliente_id));
