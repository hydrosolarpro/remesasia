-- ─────────────────────────────────────────────────────────────
-- 0056 — Reconciliación de esquema.
--
-- Varias columnas, funciones y políticas se aplicaron directo contra la
-- base de datos de producción (SQL editor / MCP) sin commitear el .sql
-- correspondiente. Esta migración documenta en git, de forma idempotente
-- y no destructiva, lo que YA existe en producción (confirmado con
-- `list_tables` / `pg_get_functiondef` contra la base real), para que el
-- historial de migraciones vuelva a ser la fuente de verdad del esquema.
--
-- Seguro de re-ejecutar: solo `add column if not exists`,
-- `create or replace function`, `drop policy if exists` + `create policy`,
-- y `add value if not exists` en enums.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Enums: valores agregados en producción sin migración.
-- ─────────────────────────────────────────────────────────────
alter type metodo_pago add value if not exists 'plin';
alter type rol add value if not exists 'administrador';
alter type rol add value if not exists 'operador_peru_miembro';

-- ─────────────────────────────────────────────────────────────
-- perfil_negocio: horario de atención y toggles de rentabilidad
-- compartida (usados por PeruDashboardView / EstadisticasView).
-- ─────────────────────────────────────────────────────────────
alter table perfil_negocio add column if not exists horario_inicio text not null default '';
alter table perfil_negocio add column if not exists horario_fin text not null default '';
alter table perfil_negocio add column if not exists compartir_rentabilidad_ve boolean not null default false;
alter table perfil_negocio add column if not exists compartir_rentabilidad_pe_miembros boolean not null default false;
comment on column perfil_negocio.rentabilidad_pct is 'Sin uso real en la app actual (declarado obsoleto en commit 3816f30); se conserva la columna, no se elimina (fuera de alcance).';
comment on column perfil_negocio.compartir_rentabilidad_ve is 'Sin uso real en la app actual (declarado obsoleto en commit 3816f30); se conserva la columna, no se elimina (fuera de alcance).';
comment on column perfil_negocio.compartir_rentabilidad_pe_miembros is 'Sin uso real en la app actual (declarado obsoleto en commit 3816f30); se conserva la columna, no se elimina (fuera de alcance).';

-- ─────────────────────────────────────────────────────────────
-- % de comisión por operador (C1 y C2 de las fórmulas de ganancia, ver
-- Calculos-tasas-dinero-comisiones.md).
-- ─────────────────────────────────────────────────────────────
alter table operador_peru_miembro add column if not exists comision_pct numeric not null default 0;
alter table operador_venezuela_perfil add column if not exists comision_pct numeric not null default 0;

-- ─────────────────────────────────────────────────────────────
-- tasas.tasa_adquisicion (Ta): usada junto a tasa_pen_ves (Tv) para
-- Ganancia Bruta/Neta.
-- ─────────────────────────────────────────────────────────────
alter table tasas add column if not exists tasa_adquisicion numeric;

-- ─────────────────────────────────────────────────────────────
-- solicitudes: tasa aplicada, validadores, y demás columnas ya declaradas
-- en 0044/0051 pero que se listan acá también por seguridad (idempotente).
-- ─────────────────────────────────────────────────────────────
alter table solicitudes add column if not exists tasa_pen_ves numeric not null default 0;
alter table solicitudes alter column tasa_pen_ves drop default;
alter table solicitudes add column if not exists validado_peru_por uuid references usuarios (id);
alter table solicitudes add column if not exists validado_ve_por uuid references usuarios (id);
alter table solicitudes add column if not exists operador_peru_miembro_id uuid references operador_peru_miembro (id);
alter table solicitudes add column if not exists derivada_de_principal boolean not null default false;
alter table solicitudes add column if not exists check_beneficiario_confirmado boolean not null default false;
alter table solicitudes add column if not exists check_beneficiario_confirmado_at timestamptz;
alter table solicitudes add column if not exists en_revision boolean not null default false;
alter table solicitudes add column if not exists en_revision_at timestamptz;
alter table solicitudes add column if not exists revision_resuelta_at timestamptz;
alter table solicitudes add column if not exists revision_resuelta_por uuid references usuarios (id);
alter table solicitudes add column if not exists monto_usd_bcv numeric;
alter table solicitudes add column if not exists monto_eur_bcv numeric;
alter table solicitudes add column if not exists tipo_transferencia text not null default 'transferencia_bancaria';
alter table solicitudes drop constraint if exists solicitudes_tipo_transferencia_check;
alter table solicitudes add constraint solicitudes_tipo_transferencia_check
  check (tipo_transferencia in ('transferencia_bancaria', 'pago_movil'));

-- ─────────────────────────────────────────────────────────────
-- Funciones: definición EXACTA tomada de producción (pg_get_functiondef).
-- create or replace es seguro de re-aplicar.
-- ─────────────────────────────────────────────────────────────
create or replace function mi_negocio_operador_peru_id() returns uuid
language sql stable security definer set search_path = public as $$
  select case (select rol from usuarios where id = auth.uid())
    when 'operador_peru' then auth.uid()
    when 'operador_peru_miembro' then (
      select operador_peru_id from operador_peru_miembro where usuario_id = auth.uid()
    )
    when 'operador_venezuela' then (
      select operador_peru_id from operador_venezuela_perfil where usuario_id = auth.uid()
    )
    else (select negocio_operador_peru_id from usuarios where id = auth.uid())
  end;
$$;

create or replace function validar_deposito_peru(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro') then
    raise exception 'Solo el Operador Perú puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_peru = true, check_deposito_peru_at = now(), validado_peru_por = auth.uid()
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_url text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_url = coalesce(p_comprobante_url, comprobante_vz_url),
        validado_ve_por = auth.uid()
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

create or replace function derivar_solicitud(p_solicitud_id uuid, p_operador_peru_miembro_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede derivar solicitudes';
  end if;

  update solicitudes
    set operador_peru_miembro_id = p_operador_peru_miembro_id,
        derivada_de_principal = true
    where id = p_solicitud_id
      and negocio_operador_peru_id = auth.uid();
end;
$$;

create or replace function publicar_tasa_del_dia(p_fecha date, p_tasa_pen_ves numeric, p_tasa_adquisicion numeric default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede publicar la tasa del día';
  end if;

  delete from tasas where fecha = p_fecha and publicada_por = auth.uid();
  insert into tasas (fecha, tasa_pen_ves, tasa_adquisicion, publicada_por)
  values (p_fecha, p_tasa_pen_ves, p_tasa_adquisicion, auth.uid());
end;
$$;

create or replace function resolver_revision_beneficiario(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update solicitudes
    set en_revision = false,
        revision_resuelta_at = now(),
        revision_resuelta_por = auth.uid(),
        check_beneficiario_confirmado = true,
        check_beneficiario_confirmado_at = now()
    where id = p_solicitud_id
      and en_revision = true
      and (
        cliente_id = auth.uid()
        or (
          rol_actual() in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela')
          and negocio_operador_peru_id = mi_negocio_operador_peru_id()
        )
      );
end;
$$;

grant execute on function validar_deposito_peru(uuid) to authenticated;
grant execute on function validar_deposito_venezuela(uuid, text) to authenticated;
grant execute on function derivar_solicitud(uuid, uuid) to authenticated;
grant execute on function publicar_tasa_del_dia(date, numeric, numeric) to authenticated;
grant execute on function resolver_revision_beneficiario(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS: políticas confirmadas en producción (pg_policies), re-declaradas
-- para que git sea la fuente de verdad.
-- ─────────────────────────────────────────────────────────────
alter table perfil_negocio enable row level security;
alter table operador_peru_miembro enable row level security;
alter table operador_venezuela_perfil enable row level security;
alter table solicitudes enable row level security;

drop policy if exists "perfil_negocio: solo su propio negocio" on perfil_negocio;
create policy "perfil_negocio: solo su propio negocio"
  on perfil_negocio for select
  using (operador_peru_id = mi_negocio_operador_peru_id());

drop policy if exists "operador_peru_miembro: el negocio entero puede ver el equipo" on operador_peru_miembro;
create policy "operador_peru_miembro: el negocio entero puede ver el equipo"
  on operador_peru_miembro for select
  using (operador_peru_id = mi_negocio_operador_peru_id());

drop policy if exists "operador_peru_miembro: el vinculado se lee a sí mismo" on operador_peru_miembro;
create policy "operador_peru_miembro: el vinculado se lee a sí mismo"
  on operador_peru_miembro for select
  using (usuario_id = auth.uid());

drop policy if exists "operador_venezuela_perfil: el vinculado se lee a sí mismo" on operador_venezuela_perfil;
create policy "operador_venezuela_perfil: el vinculado se lee a sí mismo"
  on operador_venezuela_perfil for select
  using (usuario_id = auth.uid());

drop policy if exists "solicitudes: operadores ven las de su negocio" on solicitudes;
create policy "solicitudes: operadores ven las de su negocio"
  on solicitudes for select using (
    rol_actual() in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela')
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );

drop policy if exists "solicitudes: Operador Perú actualiza las de su negocio" on solicitudes;
create policy "solicitudes: Operador Perú actualiza las de su negocio"
  on solicitudes for update
  using (
    rol_actual() in ('operador_peru', 'operador_peru_miembro')
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  )
  with check (
    rol_actual() in ('operador_peru', 'operador_peru_miembro')
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );
