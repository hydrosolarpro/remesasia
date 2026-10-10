-- Medio de pago adicional configurable por el operador Perú (además de
-- Yape/Plin), visible al cliente en la sesión de cobro.
alter table perfil_negocio add column otro_medio_nombre text;
alter table perfil_negocio add column otro_medio_telefono text;
