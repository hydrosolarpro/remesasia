-- Repara el efecto del bug corregido en 0047: las invitaciones tipo
-- 'cliente' que ya habían quedado marcadas como "usadas" (por el primer
-- cliente que las canjeó, antes del fix) vuelven a quedar reutilizables.
update invitaciones set usado_por = null, used_at = null where tipo = 'cliente' and usado_por is not null;
