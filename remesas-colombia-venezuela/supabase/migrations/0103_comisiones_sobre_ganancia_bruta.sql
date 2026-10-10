-- Corrige las fórmulas de calcular_ganancia_operacion (0061), espejo de
-- calcularGananciaOperacion en app/lib/tasaCalculo.ts.
--
-- 1) Ganancia Bruta. Antes: Ms × (Ta/Tv - 1), que es el margen sobre el
--    COSTO aplicado al monto COBRADO e inflaba la ganancia (Ms=180, Tv=259,
--    Ta=270 daba S/7.64 en vez de S/7.33). Ahora: Ms × (1 - Tv/Ta) = lo
--    cobrado menos lo que cuesta comprar los bolívares del beneficiario.
--
-- 2) Comisiones. Antes eran un % del MONTO de la operación (C1 = Ms × C1,
--    C2 = T × C2 con T = B/(1-C2)). Ahora son un % de la GANANCIA BRUTA:
--      C1(PEN) = G(bruta) × C1
--      C2(PEN) = G(bruta) × C2,  C2(VES) = C2(PEN) × Ta
--      T       = B + C2(VES)
--      G(neta) = G(bruta) - C1(PEN) - C2(PEN)
--    Si G(bruta) <= 0 no hay nada que repartir: comisiones en 0.
--
-- Al final se recalculan todos los cierres diarios ya guardados.

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
) language plpgsql immutable set search_path = public as $$
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

  -- Cada monto se redondea a céntimos antes de restar (igual que el JS),
  -- para que G(neta) = G(bruta) - C1 - C2 cuadre exacto al céntimo.
  v_beneficiario_ves := round(p_monto_pen * p_tasa_venta, 2);
  v_ganancia_bruta_pen := round(p_monto_pen * (1 - p_tasa_venta / p_tasa_adquisicion), 2);
  v_comision_peru_pen := round(greatest(v_ganancia_bruta_pen, 0) * coalesce(p_comision_peru_pct, 0), 2);
  v_comision_ve_pen := round(greatest(v_ganancia_bruta_pen, 0) * coalesce(p_comision_ve_pct, 0), 2);
  v_comision_ve_ves := round(v_comision_ve_pen * p_tasa_adquisicion, 2);
  v_transferencia_ves := v_beneficiario_ves + v_comision_ve_ves;
  v_ganancia_neta_pen := v_ganancia_bruta_pen - v_comision_peru_pen - v_comision_ve_pen;

  return query select
    round(v_beneficiario_ves, 2), round(v_transferencia_ves, 2), round(v_comision_peru_pen, 2),
    round(v_comision_ve_ves, 2), round(v_comision_ve_pen, 2), round(v_ganancia_bruta_pen, 2), round(v_ganancia_neta_pen, 2);
end;
$$;

-- El % de comisión lo asigna el principal en su Perfil: la base solo
-- acepta valores entre 0 y 100 (el formulario ya lo valida, esto evita que
-- un dato inválido llegue por otra vía y descuadre los cálculos).
alter table public.operador_peru_miembro drop constraint if exists operador_peru_miembro_comision_pct_rango;
alter table public.operador_peru_miembro
  add constraint operador_peru_miembro_comision_pct_rango check (comision_pct between 0 and 100);
alter table public.operador_venezuela_perfil drop constraint if exists operador_venezuela_perfil_comision_pct_rango;
alter table public.operador_venezuela_perfil
  add constraint operador_venezuela_perfil_comision_pct_rango check (comision_pct between 0 and 100);

-- Recalcula los cierres ya guardados con la fórmula nueva.
do $$
declare
  r record;
begin
  for r in select distinct negocio_operador_peru_id, fecha from public.cierres_diarios_operador loop
    perform public.cerrar_dia_negocio(r.negocio_operador_peru_id, r.fecha);
  end loop;
end;
$$;
