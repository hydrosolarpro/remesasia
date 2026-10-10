-- El Operador principal de Perú puede DERIVAR cada operación a un Operador
-- Venezuela de su equipo (hasta ahora solo podía derivarla a un miembro de
-- Perú, y el VE solo veía las de los miembros asignados a él -- las
-- operaciones atendidas directamente por el principal no le llegaban).
--
-- solicitudes.derivada_ve_perfil_id = operador_venezuela_perfil elegido por
-- el principal. Ese VE la ve en su panel (política RLS) y su % de comisión
-- se congela al validar el depósito en Venezuela.

alter table solicitudes
  add column if not exists derivada_ve_perfil_id uuid references operador_venezuela_perfil (id) on delete set null;

create index if not exists idx_solicitudes_derivada_ve on solicitudes (derivada_ve_perfil_id)
  where derivada_ve_perfil_id is not null;

create or replace function mi_ve_perfil_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from operador_venezuela_perfil where usuario_id = auth.uid() limit 1;
$$;

grant execute on function mi_ve_perfil_id() to authenticated;

create or replace function derivar_solicitud_a_ve(p_solicitud_id uuid, p_ve_perfil_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede derivar solicitudes';
  end if;

  if p_ve_perfil_id is not null and not exists (
    select 1 from operador_venezuela_perfil where id = p_ve_perfil_id and operador_peru_id = auth.uid()
  ) then
    raise exception 'Ese operador de Venezuela no pertenece a tu equipo';
  end if;

  update solicitudes
    set derivada_ve_perfil_id = p_ve_perfil_id
    where id = p_solicitud_id
      and negocio_operador_peru_id = auth.uid()
      and not check_deposito_ve;
end;
$$;

grant execute on function derivar_solicitud_a_ve(uuid, uuid) to authenticated;

drop policy if exists "solicitudes: operadores ven las de su negocio" on solicitudes;
create policy "solicitudes: operadores ven las de su negocio" on solicitudes
  for select
  using (
    negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and (
      rol_actual() = 'operador_peru'
      or (rol_actual() = 'operador_peru_miembro' and operador_peru_miembro_id = mi_operador_peru_miembro_id())
      or (rol_actual() = 'operador_venezuela' and operador_peru_miembro_id = any(mis_miembros_asignados_ve()))
      or (rol_actual() = 'operador_venezuela' and derivada_ve_perfil_id = mi_ve_perfil_id())
    )
  );

-- Copia de 0108 + comisión del VE al que el principal derivó la operación.
create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_urls text[] default null)
returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_miembro_id uuid;
  v_ve_id uuid;
  v_ve_derivado uuid;
  v_peru_ok boolean;
  v_comision_peru numeric := 0;
  v_comision_ve numeric := 0;
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  select operador_peru_miembro_id, check_deposito_peru, derivada_ve_perfil_id
    into v_miembro_id, v_peru_ok, v_ve_derivado
    from solicitudes
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();

  if not coalesce(v_peru_ok, false) then
    raise exception 'Primero debe validarse el depósito en soles en Perú. Hasta entonces no se puede cargar el comprobante de Venezuela.';
  end if;

  if v_miembro_id is not null then
    select comision_pct, operador_venezuela_id into v_comision_peru, v_ve_id
      from operador_peru_miembro where id = v_miembro_id;
  end if;

  -- El VE derivado por el principal manda sobre el del miembro.
  v_ve_id := coalesce(v_ve_derivado, v_ve_id);

  if v_ve_id is not null then
    select comision_pct into v_comision_ve
      from operador_venezuela_perfil where id = v_ve_id;
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_urls = coalesce(p_comprobante_urls, comprobante_vz_urls),
        validado_ve_por = auth.uid(),
        comision_peru_pct_aplicada = coalesce(comision_peru_pct_aplicada, v_comision_peru),
        comision_venezuela_pct_aplicada = coalesce(comision_venezuela_pct_aplicada, coalesce(v_comision_ve, 0))
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

grant execute on function validar_deposito_venezuela(uuid, text[]) to authenticated;
