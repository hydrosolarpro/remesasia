-- 0094 amplió usuarios.plan a 'medida' pero no el CHECK equivalente de
-- cambios_plan_pendientes.plan_solicitado. Por eso, cuando un Operador
-- Perú que YA tiene un plan pagado (STARTER..ULTRA) pedía el plan a la
-- medida, el INSERT en cambios_plan_pendientes fallaba con violación de
-- CHECK y la app solo mostraba "No se pudo enviar la solicitud." El flujo
-- "nueva" (desde DEMO) sí funcionaba porque pagos_suscripcion no tiene una
-- columna de plan solicitado.
alter table cambios_plan_pendientes drop constraint if exists cambios_plan_pendientes_plan_solicitado_check;
alter table cambios_plan_pendientes add constraint cambios_plan_pendientes_plan_solicitado_check check (
  plan_solicitado = any (array['demo','starter','pro','expert','avance','ultra','unlimited','medida'])
);
