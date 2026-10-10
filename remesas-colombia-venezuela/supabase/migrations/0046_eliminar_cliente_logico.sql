-- Borrado lógico de clientes: eliminar-cliente (Edge Function) pasó de
-- borrar físicamente la fila en `usuarios` (bloqueado por la FK NO ACTION
-- de solicitudes.cliente_id si el cliente tenía historial) a marcarla como
-- eliminada. Así el cliente desaparece de "Clientes registrados" y libera
-- su cupo, pero sus solicitudes conservan el nombre/datos del cliente en
-- reportes y exportes (Excel/PDF), sin importar cuánto historial tenga.
alter table usuarios add column eliminado_at timestamptz;
