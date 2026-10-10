-- ─────────────────────────────────────────────────────────────
-- Fase A.1 — Congela el % de comisión (C1/C2) en el momento en que una
-- operación pasa a "Realizada" (check_deposito_ve = true), para que el
-- historial nunca cambie retroactivamente si el principal ajusta el % de
-- un operador después. Ver Calculos-tasas-dinero-comisiones.md.
--
-- Antes, PeruDashboardView.tsx / EstadisticasView.tsx leían el
-- comision_pct VIGENTE de operador_peru_miembro / operador_venezuela_perfil
-- en cada carga -- si el principal cambiaba el % de un operador, TODO el
-- historial pasado recalculaba distinto. Estas 2 columnas nuevas
-- congelan el valor real usado en el momento de la operación.
-- ─────────────────────────────────────────────────────────────
alter table solicitudes add column if not exists comision_peru_pct_aplicada numeric;
alter table solicitudes add column if not exists comision_venezuela_pct_aplicada numeric;

create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_url text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_miembro_id uuid;
  v_ve_id uuid;
  v_comision_peru numeric := 0;
  v_comision_ve numeric := 0;
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  select operador_peru_miembro_id into v_miembro_id
    from solicitudes where id = p_solicitud_id;

  if v_miembro_id is not null then
    select comision_pct, operador_venezuela_id into v_comision_peru, v_ve_id
      from operador_peru_miembro where id = v_miembro_id;

    if v_ve_id is not null then
      select comision_pct into v_comision_ve
        from operador_venezuela_perfil where id = v_ve_id;
    end if;
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_url = coalesce(p_comprobante_url, comprobante_vz_url),
        validado_ve_por = auth.uid(),
        comision_peru_pct_aplicada = coalesce(comision_peru_pct_aplicada, v_comision_peru),
        comision_venezuela_pct_aplicada = coalesce(comision_venezuela_pct_aplicada, v_comision_ve)
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

grant execute on function validar_deposito_venezuela(uuid, text) to authenticated;
