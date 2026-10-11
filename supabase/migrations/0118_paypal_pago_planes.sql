-- PayPal como forma de pago de los planes: el administrador configura el
-- enlace de pago de PayPal (https://www.paypal.com/ncp/payment/...) y el
-- Operador principal lo ve como opción "PayPal" al pagar su plan, junto a
-- Yape/Plin y transferencia bancaria. El pago sigue validándose por el
-- administrador con la captura (comprobante) que sube el operador.
alter table configuracion_pagos_admin
  add column if not exists paypal_url text;

-- Enlace de PayPal entregado por el dueño del SaaS (botón "Comprar ahora").
update configuracion_pagos_admin
  set paypal_url = 'https://www.paypal.com/ncp/payment/G838K75GQZ39U'
  where paypal_url is null;
