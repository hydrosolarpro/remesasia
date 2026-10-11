-- CORREDORES (fase 3, paso 6): el cierre diario se hace POR CORREDOR, para
-- no sumar monedas de recepción distintas (PEN + COP + CLP) en una misma fila.
--   * `cierres_diarios_operador.corredor` ya existe (0112, default 'PE-VE':
--     todos los cierres históricos quedan como Perú-Venezuela).
--   * La llave única pasa a incluir el corredor.
--   * cerrar_dia_negocio agrupa por corredor y atribuye al Operador
--     Venezuela correcto: el que el principal derivó (derivada_ve_perfil_id)
--     o, si no, el del miembro de Perú que atendió.
--   * La comisión de respaldo (operaciones sin % congelado) es la del
--     corredor fijada por el principal, o la base del operador.
-- La firma (p_negocio_id uuid, p_fecha date) no cambia: el cron sigue igual.

alter table cierres_diarios_operador
  drop constraint if exists cierres_diarios_operador_negocio_operador_peru_id_tipo_refe_key;

create unique index if not exists cierres_diarios_unico_por_corredor
  on cierres_diarios_operador (negocio_operador_peru_id, tipo, referencia_id, fecha, corredor);

create or replace function cerrar_dia_negocio(p_negocio_id uuid, p_fecha date)
returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  -- Principal: una fila por corredor.
  insert into cierres_diarios_operador (
    negocio_operador_peru_id, tipo, referencia_id, fecha, corredor,
    n_operaciones, monto_pen, beneficiario_ves, transferencia_ves,
    comision_peru_pen, comision_venezuela_ves, comision_venezuela_pen,
    ganancia_bruta_pen, ganancia_neta_pen, cerrado_at
  )
  select
    p_negocio_id, 'principal', '00000000-0000-0000-0000-000000000000', p_fecha, s.corredor,
    count(*), coalesce(sum(s.monto_pen), 0), coalesce(sum(g.beneficiario_ves), 0), coalesce(sum(g.transferencia_ves), 0),
    coalesce(sum(g.comision_peru_pen), 0), coalesce(sum(g.comision_ve_ves), 0), coalesce(sum(g.comision_ve_pen), 0),
    coalesce(sum(g.ganancia_bruta_pen), 0), coalesce(sum(g.ganancia_neta_pen), 0), now()
  from solicitudes s
  left join operador_peru_miembro m on m.id = s.operador_peru_miembro_id
  left join operador_venezuela_perfil v on v.id = coalesce(s.derivada_ve_perfil_id, m.operador_venezuela_id)
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada,
             comision_pct_corredor('peru_miembro', m.id, s.corredor, m.comision_pct), 0) / 100,
    coalesce(s.comision_venezuela_pct_aplicada,
             comision_pct_corredor('venezuela', v.id, s.corredor, v.comision_pct), 0) / 100
  ) g
  where s.negocio_operador_peru_id = p_negocio_id
    and s.check_deposito_ve = true
    and (s.check_deposito_ve_at at time zone 'America/Lima')::date = p_fecha
  group by s.corredor
  on conflict (negocio_operador_peru_id, tipo, referencia_id, fecha, corredor) do update set
    n_operaciones = excluded.n_operaciones, monto_pen = excluded.monto_pen,
    beneficiario_ves = excluded.beneficiario_ves, transferencia_ves = excluded.transferencia_ves,
    comision_peru_pen = excluded.comision_peru_pen, comision_venezuela_ves = excluded.comision_venezuela_ves,
    comision_venezuela_pen = excluded.comision_venezuela_pen, ganancia_bruta_pen = excluded.ganancia_bruta_pen,
    ganancia_neta_pen = excluded.ganancia_neta_pen, cerrado_at = now();

  -- Miembro de Perú: una fila por miembro y corredor.
  insert into cierres_diarios_operador (
    negocio_operador_peru_id, tipo, referencia_id, fecha, corredor,
    n_operaciones, monto_pen, beneficiario_ves, transferencia_ves,
    comision_peru_pen, comision_venezuela_ves, comision_venezuela_pen,
    ganancia_bruta_pen, ganancia_neta_pen, cerrado_at
  )
  select
    p_negocio_id, 'miembro', s.operador_peru_miembro_id, p_fecha, s.corredor,
    count(*), coalesce(sum(s.monto_pen), 0), coalesce(sum(g.beneficiario_ves), 0), coalesce(sum(g.transferencia_ves), 0),
    coalesce(sum(g.comision_peru_pen), 0), coalesce(sum(g.comision_ve_ves), 0), coalesce(sum(g.comision_ve_pen), 0),
    coalesce(sum(g.ganancia_bruta_pen), 0), coalesce(sum(g.ganancia_neta_pen), 0), now()
  from solicitudes s
  join operador_peru_miembro m on m.id = s.operador_peru_miembro_id
  left join operador_venezuela_perfil v on v.id = coalesce(s.derivada_ve_perfil_id, m.operador_venezuela_id)
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada,
             comision_pct_corredor('peru_miembro', m.id, s.corredor, m.comision_pct), 0) / 100,
    coalesce(s.comision_venezuela_pct_aplicada,
             comision_pct_corredor('venezuela', v.id, s.corredor, v.comision_pct), 0) / 100
  ) g
  where s.negocio_operador_peru_id = p_negocio_id
    and s.check_deposito_ve = true
    and (s.check_deposito_ve_at at time zone 'America/Lima')::date = p_fecha
  group by s.operador_peru_miembro_id, s.corredor
  on conflict (negocio_operador_peru_id, tipo, referencia_id, fecha, corredor) do update set
    n_operaciones = excluded.n_operaciones, monto_pen = excluded.monto_pen,
    beneficiario_ves = excluded.beneficiario_ves, transferencia_ves = excluded.transferencia_ves,
    comision_peru_pen = excluded.comision_peru_pen, comision_venezuela_ves = excluded.comision_venezuela_ves,
    comision_venezuela_pen = excluded.comision_venezuela_pen, ganancia_bruta_pen = excluded.ganancia_bruta_pen,
    ganancia_neta_pen = excluded.ganancia_neta_pen, cerrado_at = now();

  -- Operador Venezuela: una fila por VE y corredor (derivadas + las de sus miembros).
  insert into cierres_diarios_operador (
    negocio_operador_peru_id, tipo, referencia_id, fecha, corredor,
    n_operaciones, monto_pen, beneficiario_ves, transferencia_ves,
    comision_peru_pen, comision_venezuela_ves, comision_venezuela_pen,
    ganancia_bruta_pen, ganancia_neta_pen, cerrado_at
  )
  select
    p_negocio_id, 'venezuela', v.id, p_fecha, s.corredor,
    count(*), coalesce(sum(s.monto_pen), 0), coalesce(sum(g.beneficiario_ves), 0), coalesce(sum(g.transferencia_ves), 0),
    coalesce(sum(g.comision_peru_pen), 0), coalesce(sum(g.comision_ve_ves), 0), coalesce(sum(g.comision_ve_pen), 0),
    coalesce(sum(g.ganancia_bruta_pen), 0), coalesce(sum(g.ganancia_neta_pen), 0), now()
  from solicitudes s
  left join operador_peru_miembro m on m.id = s.operador_peru_miembro_id
  join operador_venezuela_perfil v on v.id = coalesce(s.derivada_ve_perfil_id, m.operador_venezuela_id)
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada,
             comision_pct_corredor('peru_miembro', m.id, s.corredor, m.comision_pct), 0) / 100,
    coalesce(s.comision_venezuela_pct_aplicada,
             comision_pct_corredor('venezuela', v.id, s.corredor, v.comision_pct), 0) / 100
  ) g
  where s.negocio_operador_peru_id = p_negocio_id
    and s.check_deposito_ve = true
    and (s.check_deposito_ve_at at time zone 'America/Lima')::date = p_fecha
  group by v.id, s.corredor
  on conflict (negocio_operador_peru_id, tipo, referencia_id, fecha, corredor) do update set
    n_operaciones = excluded.n_operaciones, monto_pen = excluded.monto_pen,
    beneficiario_ves = excluded.beneficiario_ves, transferencia_ves = excluded.transferencia_ves,
    comision_peru_pen = excluded.comision_peru_pen, comision_venezuela_ves = excluded.comision_venezuela_ves,
    comision_venezuela_pen = excluded.comision_venezuela_pen, ganancia_bruta_pen = excluded.ganancia_bruta_pen,
    ganancia_neta_pen = excluded.ganancia_neta_pen, cerrado_at = now();
end;
$$;
