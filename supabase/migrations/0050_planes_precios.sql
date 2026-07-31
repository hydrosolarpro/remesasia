-- Expande el CHECK constraint de usuarios.plan para admitir los nuevos planes
-- con precios fijos: STARTER (S/100), PRO (S/200), EXPERT (S/300), AVANCE
-- (S/500) y ULTRA (monto acordado con el operador).
-- El operador existente con plan 'starter' se conserva tal cual.
alter table usuarios drop constraint if exists usuarios_plan_check;
alter table usuarios add constraint usuarios_plan_check check (
  plan in ('demo', 'starter', 'pro', 'expert', 'avance', 'ultra')
);
