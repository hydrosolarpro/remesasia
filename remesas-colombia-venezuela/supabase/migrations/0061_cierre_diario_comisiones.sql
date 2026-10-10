-- ─────────────────────────────────────────────────────────────
-- Fase A.2 — Cierre diario de comisiones: persiste (en vez de recalcular
-- siempre en memoria) los totales de cada día de negocio, para que el
-- historial nunca cambie si luego cambia el % de comisión de un operador.
-- Ver Calculos-tasas-dinero-comisiones.md y app/lib/tasaCalculo.ts.
-- ─────────────────────────────────────────────────────────────

-- Espejo en SQL de calcularGananciaOperacion (app/lib/tasaCalculo.ts), para
-- que el cierre diario use exactamente la misma fórmula que el Panel y
-- Estadísticas.
create or replace function calcular_ganancia_operacion(
  p_monto_pen numeric,
  p_tasa_venta numeric,
  p_tasa_adquisicion numeric,
  p_comision_peru_pct numeric,
  p_comision_ve_pct numeric
) returns table (
  beneficiario_ves numeric,
  transferencia_ves numeric,
  comision_peru_pen numeric,
  comision_ve_ves numeric,
  comision_ve_pen numeric,
  ganancia_bruta_pen numeric,
  ganancia_neta_pen numeric
) language plpgsql immutable as $$
declare
  v_beneficiario_ves numeric;
  v_transferencia_ves numeric;
  v_comision_peru_pen numeric;
  v_comision_ve_ves numeric;
  v_comision_ve_pen numeric;
  v_ganancia_bruta_pen numeric;
  v_ganancia_neta_pen numeric;
begin
  if p_tasa_adquisicion is null or p_tasa_adquisicion = 0 or p_tasa_venta is null or p_tasa_venta = 0 or p_monto_pen is null then
    return query select null::numeric, null::numeric, null::numeric, null::numeric, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  v_beneficiario_ves := p_monto_pen * p_tasa_venta;
  v_transferencia_ves := v_beneficiario_ves / (1 - coalesce(p_comision_ve_pct, 0));
  v_comision_ve_ves := v_transferencia_ves * coalesce(p_comision_ve_pct, 0);
  v_comision_ve_pen := v_comision_ve_ves / p_tasa_adquisicion;
  v_comision_peru_pen := p_monto_pen * coalesce(p_comision_peru_pct, 0);
  v_ganancia_bruta_pen := p_monto_pen * (p_tasa_adquisicion / p_tasa_venta - 1);
  v_ganancia_neta_pen := v_ganancia_bruta_pen - v_comision_peru_pen - v_comision_ve_pen;

  return query select
    round(v_beneficiario_ves, 2), round(v_transferencia_ves, 2), round(v_comision_peru_pen, 2),
    round(v_comision_ve_ves, 2), round(v_comision_ve_pen, 2), round(v_ganancia_bruta_pen, 2), round(v_ganancia_neta_pen, 2);
end;
$$;

-- Tabla de cierre diario. referencia_id usa un uuid placeholder (todo
-- ceros) en vez de NULL para la fila 'principal', así el unique
-- constraint funciona sin índices parciales.
create table if not exists cierres_diarios_operador (
  id uuid primary key default gen_random_uuid(),
  negocio_operador_peru_id uuid not null references usuarios (id) on delete cascade,
  tipo text not null check (tipo in ('principal', 'miembro', 'venezuela')),
  referencia_id uuid not null default '00000000-0000-0000-0000-000000000000',
  fecha date not null,
  n_operaciones int not null default 0,
  monto_pen numeric not null default 0,
  beneficiario_ves numeric not null default 0,
  transferencia_ves numeric not null default 0,
  comision_peru_pen numeric not null default 0,
  comision_venezuela_ves numeric not null default 0,
  comision_venezuela_pen numeric not null default 0,
  ganancia_bruta_pen numeric not null default 0,
  ganancia_neta_pen numeric not null default 0,
  cerrado_at timestamptz not null default now(),
  unique (negocio_operador_peru_id, tipo, referencia_id, fecha)
);

create index if not exists idx_cierres_diarios_negocio_fecha on cierres_diarios_operador (negocio_operador_peru_id, fecha desc);

alter table cierres_diarios_operador enable row level security;

drop policy if exists "cierres_diarios_operador: principal ve todo su negocio" on cierres_diarios_operador;
create policy "cierres_diarios_operador: principal ve todo su negocio"
  on cierres_diarios_operador for select
  using (rol_actual() = 'operador_peru' and negocio_operador_peru_id = mi_negocio_operador_peru_id());

drop policy if exists "cierres_diarios_operador: miembro ve sus propias filas" on cierres_diarios_operador;
create policy "cierres_diarios_operador: miembro ve sus propias filas"
  on cierres_diarios_operador for select
  using (
    rol_actual() = 'operador_peru_miembro'
    and tipo = 'miembro'
    and referencia_id = (select id from operador_peru_miembro where usuario_id = auth.uid())
  );

drop policy if exists "cierres_diarios_operador: VE ve sus propias filas" on cierres_diarios_operador;
create policy "cierres_diarios_operador: VE ve sus propias filas"
  on cierres_diarios_operador for select
  using (
    rol_actual() = 'operador_venezuela'
    and tipo = 'venezuela'
    and referencia_id = (select id from operador_venezuela_perfil where usuario_id = auth.uid())
  );

-- cerrar_dia_negocio: agrega las operaciones "Realizadas"
-- (check_deposito_ve = true) de un día de negocio (huso America/Lima,
-- mismo criterio que app/lib/fechaLocal.ts) en 3 niveles -- principal
-- (todo el negocio), cada miembro de Perú, y cada Operador Venezuela -- y
-- las guarda (upsert) en cierres_diarios_operador. SECURITY DEFINER
-- porque lo dispara pg_cron, no un usuario autenticado.
create or replace function cerrar_dia_negocio(p_negocio_id uuid, p_fecha date) returns void
language plpgsql security definer set search_path = public as $$
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
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada, 0) / 100, coalesce(s.comision_venezuela_pct_aplicada, 0) / 100
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
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada, 0) / 100, coalesce(s.comision_venezuela_pct_aplicada, 0) / 100
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
  cross join lateral calcular_ganancia_operacion(
    s.monto_pen, s.tasa_pen_ves, s.tasa_real_compra,
    coalesce(s.comision_peru_pct_aplicada, 0) / 100, coalesce(s.comision_venezuela_pct_aplicada, 0) / 100
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
$$;

-- Wrapper para que el Operador Principal pueda forzar el cierre de un día
-- puntual (backfill de días anteriores a esta migración, o re-cierre
-- manual si hiciera falta), sin exponer cerrar_dia_negocio directamente.
create or replace function cerrar_dia_negocio_manual(p_fecha date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede cerrar el día';
  end if;

  perform cerrar_dia_negocio(auth.uid(), p_fecha);
end;
$$;

grant execute on function cerrar_dia_negocio_manual(date) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Automatización: cada 5 minutos, revisa qué negocios ya pasaron su
-- horario_fin (huso America/Lima) y aún no tienen cierre 'principal' para
-- el día de hoy, y los cierra.
-- ─────────────────────────────────────────────────────────────
create extension if not exists pg_cron with schema extensions;

grant usage on schema cron to postgres;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cerrar-dia-negocios';
exception when others then
  null;
end;
$$;

select cron.schedule(
  'cerrar-dia-negocios',
  '*/5 * * * *',
  $cron$
  select cerrar_dia_negocio(pn.operador_peru_id, (now() at time zone 'America/Lima')::date)
  from perfil_negocio pn
  where pn.horario_fin is not null and pn.horario_fin <> ''
    and (now() at time zone 'America/Lima')::time >= pn.horario_fin::time
    and not exists (
      select 1 from cierres_diarios_operador c
      where c.negocio_operador_peru_id = pn.operador_peru_id
        and c.tipo = 'principal'
        and c.fecha = (now() at time zone 'America/Lima')::date
    );
  $cron$
);
