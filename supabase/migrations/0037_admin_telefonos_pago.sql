-- Reemplaza el QR de Yape/Plin del admin por teléfono editable (mismo
-- patrón ya usado en perfil_negocio para el Operador Perú), más un medio
-- de pago adicional configurable.
alter table configuracion_pagos_admin add column yape_telefono text;
alter table configuracion_pagos_admin add column plin_telefono text;
alter table configuracion_pagos_admin add column otro_medio_nombre text;
alter table configuracion_pagos_admin add column otro_medio_telefono text;
