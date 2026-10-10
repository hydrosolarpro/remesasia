-- Máquina de estados de `solicitudes` + vista de dashboard financiero.

-- ─────────────────────────────────────────────────────────────
-- updated_at automático
-- ─────────────────────────────────────────────────────────────
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_solicitudes_updated_at
  before update on solicitudes
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Transiciones válidas del ciclo de vida (sección 7 del PRD)
-- ─────────────────────────────────────────────────────────────
create function validar_transicion_estado() returns trigger as $$
declare
  transiciones_validas estado_solicitud[];
begin
  if new.estado = old.estado then
    return new;
  end if;

  transiciones_validas := case old.estado
    when 'BORRADOR' then array['PENDIENTE']::estado_solicitud[]
    when 'PENDIENTE' then array['EN_VERIFICACION', 'CANCELADA']::estado_solicitud[]
    when 'EN_VERIFICACION' then array['FONDOS_VERIFICADOS', 'RECHAZADA']::estado_solicitud[]
    when 'FONDOS_VERIFICADOS' then array['EN_PROCESO', 'CANCELADA']::estado_solicitud[]
    when 'EN_PROCESO' then array['COMPLETADA', 'CANCELADA']::estado_solicitud[]
    else array[]::estado_solicitud[]
  end;

  if not (new.estado = any (transiciones_validas)) then
    raise exception 'Transición de estado inválida: % -> %', old.estado, new.estado;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validar_transicion_estado
  before update on solicitudes
  for each row execute function validar_transicion_estado();

-- ─────────────────────────────────────────────────────────────
-- F10/F11 — Dashboard financiero (totales diario/mensual/anual)
-- Vista simple (no materializada): a esta escala de volumen el costo de
-- recalcular en cada consulta es despreciable y evita gestionar refresh.
-- ─────────────────────────────────────────────────────────────
create view operaciones_dashboard as
select
  date(created_at) as fecha,
  count(*) as n_ops,
  sum(monto_pen) as vol_pen,
  sum(monto_usdt) as vol_usdt,
  sum((tasa_pen_usdt - coalesce(tasa_real_compra, tasa_pen_usdt)) * monto_usdt) as ganancia_neta
from solicitudes
where estado = 'COMPLETADA'
group by date(created_at);

-- La vista respeta RLS de `solicitudes` (security_invoker), así que solo
-- Operador Perú/Venezuela obtienen filas (clientes no tienen policy de SELECT global).
alter view operaciones_dashboard set (security_invoker = true);
