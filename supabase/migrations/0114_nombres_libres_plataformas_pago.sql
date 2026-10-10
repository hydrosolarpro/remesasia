-- CORREDORES (fase 3, paso 2): el operador principal escribe LIBREMENTE el
-- nombre de sus plataformas de pago por corredor (Nequi, Daviplata, Mach,
-- Bre-B, Transfiya, PayPal, Zelle... lo que use). Los nombres del catálogo
-- (`corredores.billetera_1/2`) quedan solo como sugerencia por defecto.
alter table perfil_negocio_corredor
  add column if not exists billetera_1_nombre text,
  add column if not exists billetera_2_nombre text;
