-- CORREDORES (fase 3, paso 3): la comisión de cada operador (miembro de
-- Perú / operador de Venezuela) la FIJA el operador principal (dueño del
-- negocio), y puede ser distinta por corredor. Si para un corredor no hay
-- un valor propio, se usa el % base de siempre (operador_peru_miembro.comision_pct
-- / operador_venezuela_perfil.comision_pct): Perú-Venezuela no cambia.

create table if not exists comisiones_corredor (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references usuarios (id) on delete cascade,
  tipo text not null check (tipo in ('peru_miembro', 'venezuela')),
  operador_id uuid not null,            -- operador_peru_miembro.id u operador_venezuela_perfil.id
  corredor text not null references corredores (id),
  comision_pct numeric not null check (comision_pct >= 0 and comision_pct <= 100),
  updated_at timestamptz not null default now(),
  unique (tipo, operador_id, corredor)
);

alter table comisiones_corredor enable row level security;

-- El principal ve y fija todas; cada operador ve SOLO la suya (igual que
-- hoy: nadie ve la comisión de otro).
drop policy if exists "comisiones_corredor: lectura" on comisiones_corredor;
create policy "comisiones_corredor: lectura" on comisiones_corredor
  for select to authenticated
  using (
    (negocio_id = auth.uid() and rol_actual() = 'operador_peru')
    or (tipo = 'peru_miembro' and operador_id = mi_operador_peru_miembro_id())
    or (tipo = 'venezuela' and operador_id = mi_ve_perfil_id())
  );

drop policy if exists "comisiones_corredor: el principal fija" on comisiones_corredor;
create policy "comisiones_corredor: el principal fija" on comisiones_corredor
  for all to authenticated
  using (negocio_id = auth.uid() and rol_actual() = 'operador_peru')
  with check (negocio_id = auth.uid() and rol_actual() = 'operador_peru');

create or replace function comision_pct_corredor(p_tipo text, p_operador_id uuid, p_corredor text, p_base numeric)
returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select comision_pct from comisiones_corredor
       where tipo = p_tipo and operador_id = p_operador_id and corredor = p_corredor),
    p_base
  );
$$;

-- validar_deposito_venezuela: el % que se congela en la operación es el del
-- corredor de la solicitud (si el principal lo fijó), o el base.
-- Copia de 0111 + corredor.
create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_urls text[] default null)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_miembro_id uuid;
  v_ve_id uuid;
  v_ve_derivado uuid;
  v_peru_ok boolean;
  v_corredor text;
  v_base_peru numeric;
  v_base_ve numeric;
  v_comision_peru numeric := 0;
  v_comision_ve numeric := 0;
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  select operador_peru_miembro_id, check_deposito_peru, derivada_ve_perfil_id, corredor
    into v_miembro_id, v_peru_ok, v_ve_derivado, v_corredor
    from solicitudes
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();

  if not coalesce(v_peru_ok, false) then
    raise exception 'Primero debe validarse el depósito en soles en Perú. Hasta entonces no se puede cargar el comprobante de Venezuela.';
  end if;

  if v_miembro_id is not null then
    select comision_pct, operador_venezuela_id into v_base_peru, v_ve_id
      from operador_peru_miembro where id = v_miembro_id;
    v_comision_peru := comision_pct_corredor('peru_miembro', v_miembro_id, v_corredor, coalesce(v_base_peru, 0));
  end if;

  -- El VE derivado por el principal manda sobre el del miembro.
  v_ve_id := coalesce(v_ve_derivado, v_ve_id);

  if v_ve_id is not null then
    select comision_pct into v_base_ve from operador_venezuela_perfil where id = v_ve_id;
    v_comision_ve := comision_pct_corredor('venezuela', v_ve_id, v_corredor, coalesce(v_base_ve, 0));
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_urls = coalesce(p_comprobante_urls, comprobante_vz_urls),
        validado_ve_por = auth.uid(),
        comision_peru_pct_aplicada = coalesce(comision_peru_pct_aplicada, v_comision_peru),
        comision_venezuela_pct_aplicada = coalesce(comision_venezuela_pct_aplicada, v_comision_ve)
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

grant execute on function validar_deposito_venezuela(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- EQUIPO POR CORREDOR: el operador principal arma su equipo según el país de
-- recepción (y de entrega): cada miembro de Perú / operador de Venezuela
-- trabaja en los corredores que el principal le asigne. Un operador SIN
-- filas aquí trabaja solo Perú-Venezuela (comportamiento de siempre), así
-- que nada existente cambia; abajo se respalda a los actuales en 'PE-VE'.
create table if not exists equipo_corredor (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references usuarios (id) on delete cascade,
  tipo text not null check (tipo in ('peru_miembro', 'venezuela')),
  operador_id uuid not null,            -- operador_peru_miembro.id u operador_venezuela_perfil.id
  corredor text not null references corredores (id),
  created_at timestamptz not null default now(),
  unique (tipo, operador_id, corredor)
);

alter table equipo_corredor enable row level security;

drop policy if exists "equipo_corredor: lectura" on equipo_corredor;
create policy "equipo_corredor: lectura" on equipo_corredor
  for select to authenticated
  using (
    (negocio_id = auth.uid() and rol_actual() = 'operador_peru')
    or (tipo = 'peru_miembro' and operador_id = mi_operador_peru_miembro_id())
    or (tipo = 'venezuela' and operador_id = mi_ve_perfil_id())
  );

drop policy if exists "equipo_corredor: el principal arma su equipo" on equipo_corredor;
create policy "equipo_corredor: el principal arma su equipo" on equipo_corredor
  for all to authenticated
  using (negocio_id = auth.uid() and rol_actual() = 'operador_peru')
  with check (negocio_id = auth.uid() and rol_actual() = 'operador_peru');

insert into equipo_corredor (negocio_id, tipo, operador_id, corredor)
select operador_peru_id, 'peru_miembro', id, 'PE-VE' from operador_peru_miembro
on conflict do nothing;

insert into equipo_corredor (negocio_id, tipo, operador_id, corredor)
select operador_peru_id, 'venezuela', id, 'PE-VE' from operador_venezuela_perfil
on conflict do nothing;
