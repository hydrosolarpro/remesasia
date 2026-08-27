-- El plan UNLIMITED no tiene tarifa fija -- se acuerda por WhatsApp
-- directamente con el administrador. Antes de esto, solicitarlo exigía
-- que el Operador Perú ya conociera el monto y subiera un comprobante de
-- un pago que todavía no se había acordado. Ahora la solicitud de
-- UNLIMITED se guarda con monto=0 y `monto_por_definir=true` (sin
-- comprobante), para que aparezca en Panel de Control como "a consultar"
-- en la tarjeta de ese operador, y el admin recién ahí fija el monto real
-- una vez que se pusieron de acuerdo -- ver FormularioSolicitudPlan.tsx y
-- (admin)/panel-control.tsx.
alter table pagos_suscripcion add column monto_por_definir boolean not null default false;
alter table cambios_plan_pendientes add column monto_por_definir boolean not null default false;

-- comprobante_url ya era nullable en ambas tablas -- una solicitud "a
-- consultar" no tiene comprobante todavía.
