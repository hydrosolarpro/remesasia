-- Repara la columna que 0051_equipos_operadores.sql debía crear pero nunca
-- quedó aplicada en producción (esa migración se fue aplicando a mano por
-- partes y esta columna se saltó). El trigger
-- asignar_operador_miembro_a_solicitud() (BEFORE INSERT ON solicitudes)
-- depende de ella; sin la columna, todo insert en solicitudes fallaba con
-- "column ... does not exist" -- causa raíz de "No se pudo enviar la
-- solicitud." reportado por clientes.
alter table usuarios add column if not exists invitado_por_operador_miembro_id uuid
  references operador_peru_miembro (id);

create index if not exists idx_usuarios_invitado_por_miembro on usuarios (invitado_por_operador_miembro_id);
