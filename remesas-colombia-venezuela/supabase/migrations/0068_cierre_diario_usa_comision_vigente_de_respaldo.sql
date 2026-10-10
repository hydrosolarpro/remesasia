-- cerrar_dia_negocio() (0061_cierre_diario_comisiones.sql) calculaba la
-- comisión de cada operación con
-- `coalesce(s.comision_peru_pct_aplicada, 0) / 100` -- es decir, si la
-- solicitud es anterior a que se empezara a congelar el % en
-- check_deposito_ve (0060_congelar_comision_aplicada.sql) y por lo tanto
-- comision_*_pct_aplicada es NULL, el cierre diario la trataba como 0% de
-- comisión.
--
-- Esto diverge del cálculo que YA usan las pantallas en vivo
-- (PeruDashboardView.tsx / EstadisticasView.tsx), que en ese mismo caso
-- caen al % VIGENTE del operador (miembro.comision_pct /
-- ve_perfil.comision_pct) en vez de 0. Resultado: para cualquier solicitud
-- anterior a la migración 0060, el cierre diario (tabla
-- cierres_diarios_operador, alimentada cada 5 min por el pg_cron
-- "cerrar-dia-negocios") queda con una ganancia neta más alta que la que
-- el operador ve en pantalla para el mismo día -- dos fuentes de verdad en
-- desacuerdo sobre el mismo número.
--
-- Se corrige para que el cierre use exactamente el mismo criterio de
-- respaldo que el JS: comisión congelada -> comisión vigente del operador
-- -> 0 solo si ninguna de las dos existe.

create or replace function cerrar_dia_negocio(p_negocio_id uuid, p_fecha date) returns void as $$
begin
  -- Fila "principal": todas las operaciones realizadas ese día.
  insert into cierres_diarios_operador (
    negocio_operador_peru_id, tipo, referencia_id, fecha,
    n_operaciones, monto_pen, beneficiario_ves, transferencia_ves,
    comision_peru_pen, comision_venezuela_ves, comision_venezuela_pen,
    ganancia_bruta_pen, ganancia_neta_pen, cerrado_at
  )
  select
    p_negocio_id, 'principal', '00000000-0000-0000-0000-000000000000', p_fecha,
    count(*), coalesce(sum(s.monto_pen), 0), coalesce(sum(g.beneficiario_ves), 0), coalesce(sum(g.transferencia_ves), 0),
    coalesce(sum(g.comision_peru_pen), 0), coalesce(sum(g.comision_ve_ves), 0), coalesce(sum(g.comision_ve_pen), 0),
    coalesce(sum(g.ganancia_bruta_pen), 0), coalesce(sum(g.ganancia_neta_pen), 0), now()
  from solicitudes s
  left join operador_peru_miembro m on m.id = s.operador_peru_miembro_id
  left join operador_venezuela_perfil v on v.id = m.operador_venezuela_id
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada, m.comision_pct, 0) / 100,
    coalesce(s.comision_venezuela_pct_aplicada, v.comision_pct, 0) / 100
  ) g
  where s.negocio_operador_peru_id = p_negocio_id
    and s.check_deposito_ve = true
    and (s.check_deposito_ve_at at time zone 'America/Lima')::date = p_fecha
  on conflict (negocio_operador_peru_id, tipo, referencia_id, fecha) do update set
    n_operaciones = excluded.n_operaciones, monto_pen = excluded.monto_pen,
    beneficiario_ves = excluded.beneficiario_ves, transferencia_ves = excluded.transferencia_ves,
    comision_peru_pen = excluded.comision_peru_pen, comision_venezuela_ves = excluded.comision_venezuela_ves,
    comision_venezuela_pen = excluded.comision_venezuela_pen, ganancia_bruta_pen = excluded.ganancia_bruta_pen,
    ganancia_neta_pen = excluded.ganancia_neta_pen, cerrado_at = now();

  -- Filas "miembro": agrupado por operador_peru_miembro_id.
  insert into cierres_diarios_operador (
    negocio_operador_peru_id, tipo, referencia_id, fecha,
    n_operaciones, monto_pen, beneficiario_ves, transferencia_ves,
    comision_peru_pen, comision_venezuela_ves, comision_venezuela_pen,
    ganancia_bruta_pen, ganancia_neta_pen, cerrado_at
  )
  select
    p_negocio_id, 'miembro', s.operador_peru_miembro_id, p_fecha,
    count(*), coalesce(sum(s.monto_pen), 0), coalesce(sum(g.beneficiario_ves), 0), coalesce(sum(g.transferencia_ves), 0),
    coalesce(sum(g.comision_peru_pen), 0), coalesce(sum(g.comision_ve_ves), 0), coalesce(sum(g.comision_ve_pen), 0),
    coalesce(sum(g.ganancia_bruta_pen), 0), coalesce(sum(g.ganancia_neta_pen), 0), now()
  from solicitudes s
  left join operador_peru_miembro m on m.id = s.operador_peru_miembro_id
  left join operador_venezuela_perfil v on v.id = m.operador_venezuela_id
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada, m.comision_pct, 0) / 100,
    coalesce(s.comision_venezuela_pct_aplicada, v.comision_pct, 0) / 100
  ) g
  where s.negocio_operador_peru_id = p_negocio_id
    and s.check_deposito_ve = true
    and (s.check_deposito_ve_at at time zone 'America/Lima')::date = p_fecha
    and s.operador_peru_miembro_id is not null
  group by s.operador_peru_miembro_id
  on conflict (negocio_operador_peru_id, tipo, referencia_id, fecha) do update set
    n_operaciones = excluded.n_operaciones, monto_pen = excluded.monto_pen,
    beneficiario_ves = excluded.beneficiario_ves, transferencia_ves = excluded.transferencia_ves,
    comision_peru_pen = excluded.comision_peru_pen, comision_venezuela_ves = excluded.comision_venezuela_ves,
    comision_venezuela_pen = excluded.comision_venezuela_pen, ganancia_bruta_pen = excluded.ganancia_bruta_pen,
    ganancia_neta_pen = excluded.ganancia_neta_pen, cerrado_at = now();

  -- Filas "venezuela": agrupado por el operador_venezuela_id asignado al
  -- miembro de Perú que atendió cada operación.
  insert into cierres_diarios_operador (
    negocio_operador_peru_id, tipo, referencia_id, fecha,
    n_operaciones, monto_pen, beneficiario_ves, transferencia_ves,
    comision_peru_pen, comision_venezuela_ves, comision_venezuela_pen,
    ganancia_bruta_pen, ganancia_neta_pen, cerrado_at
  )
  select
    p_negocio_id, 'venezuela', m.operador_venezuela_id, p_fecha,
    count(*), coalesce(sum(s.monto_pen), 0), coalesce(sum(g.beneficiario_ves), 0), coalesce(sum(g.transferencia_ves), 0),
    coalesce(sum(g.comision_peru_pen), 0), coalesce(sum(g.comision_ve_ves), 0), coalesce(sum(g.comision_ve_pen), 0),
    coalesce(sum(g.ganancia_bruta_pen), 0), coalesce(sum(g.ganancia_neta_pen), 0), now()
  from solicitudes s
  join operador_peru_miembro m on m.id = s.operador_peru_miembro_id
  left join operador_venezuela_perfil v on v.id = m.operador_venezuela_id
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada, m.comision_pct, 0) / 100,
    coalesce(s.comision_venezuela_pct_aplicada, v.comision_pct, 0) / 100
  ) g
  where s.negocio_operador_peru_id = p_negocio_id
    and s.check_deposito_ve = true
    and (s.check_deposito_ve_at at time zone 'America/Lima')::date = p_fecha
    and m.operador_venezuela_id is not null
  group by m.operador_venezuela_id
  on conflict (negocio_operador_peru_id, tipo, referencia_id, fecha) do update set
    n_operaciones = excluded.n_operaciones, monto_pen = excluded.monto_pen,
    beneficiario_ves = excluded.beneficiario_ves, transferencia_ves = excluded.transferencia_ves,
    comision_peru_pen = excluded.comision_peru_pen, comision_venezuela_ves = excluded.comision_venezuela_ves,
    comision_venezuela_pen = excluded.comision_venezuela_pen, ganancia_bruta_pen = excluded.ganancia_bruta_pen,
    ganancia_neta_pen = excluded.ganancia_neta_pen, cerrado_at = now();
end;
$$ language plpgsql security definer set search_path = public;
