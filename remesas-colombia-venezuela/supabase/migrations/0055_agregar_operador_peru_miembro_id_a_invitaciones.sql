-- Otra pieza faltante de 0051_equipos_operadores.sql: la app
-- (lib/invitaciones.ts -> obtenerOCrearInvitacionCliente) inserta
-- operador_peru_miembro_id al crear la invitación de un miembro, pero la
-- columna nunca se creó en producción. El Operador principal no lo nota
-- porque su invitación ya existía de antes (se reutiliza, nunca vuelve a
-- insertar), pero cualquier miembro nuevo que intente generar la suya por
-- primera vez recibe "could not find column" -- causa raíz adicional de
-- que el botón de invitación no funcione en la sesión de un miembro.
alter table invitaciones add column if not exists operador_peru_miembro_id uuid
  references operador_peru_miembro (id);
