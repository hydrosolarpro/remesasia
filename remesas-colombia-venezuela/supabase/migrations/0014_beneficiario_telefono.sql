-- Faltaba persistir el teléfono del beneficiario en Venezuela — el
-- formulario del cliente ya lo pedía pero nunca se guardaba en
-- `solicitudes`. Se necesita para el enlace de WhatsApp al completar la
-- operación (ver componentes/OperationRow.tsx).
alter table solicitudes add column beneficiario_telefono text;
