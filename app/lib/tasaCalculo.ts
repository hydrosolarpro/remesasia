export interface DesgloseConversion {
  montoPen: number;
  tasaPenVes: number;
  montoVes: number;
}

/**
 * Calculadora directa Soles -> Bolívares Soberanos.
 * tasaPenVes: cuántos bolívares equivalen a 1 sol (ej. 34.20 => S/1 = Bs 34.20)
 */
export function calcularConversion(montoPen: number, tasaPenVes: number): DesgloseConversion {
  const montoVes = montoPen * tasaPenVes;
  return {
    montoPen,
    tasaPenVes,
    montoVes: Number(montoVes.toFixed(2)),
  };
}

/** Bolívares -> Soles: inversa de calcularConversion. */
export function calcularConversionInversa(montoVes: number, tasaPenVes: number): number {
  return Number((montoVes / tasaPenVes).toFixed(2));
}

/** Divisa BCV (USD/EUR) -> Bolívares: montoDivisa × xVes. */
export function divisaAVes(montoDivisa: number, xVes: number): number {
  return Number((montoDivisa * xVes).toFixed(2));
}

/** Bolívares -> Divisa BCV (USD/EUR): montoVes ÷ xVes. */
export function vesADivisa(montoVes: number, xVes: number): number {
  return Number((montoVes / xVes).toFixed(2));
}

// Fórmulas de Ganancia Bruta/Neta y comisiones -- ver
// "Calculos-tasas-dinero-comisiones/Calculos-tasas-dinero-comisiones.md".
// Ms=montoPen, Tv=tasaVenta, Ta=tasaAdquisicion, C1/C2=comisiones (0.02 = 2%).
export interface GananciaOperacion {
  /** B: bolívares que recibe el beneficiario (Ms × Tv). */
  beneficiarioVes: number;
  /** T: total que el remesero envía a Venezuela (B + comisión Vzla), = B/(1-C2). Nunca se mezcla con B. */
  transferenciaTotalVes: number;
  /** C1(PEN): comisión del operador de Perú que atendió. */
  comisionPeruPen: number;
  /** C2(VES): comisión del Operador Venezuela que atendió, en bolívares. */
  comisionVenezuelaVes: number;
  /** C2(PEN): la misma comisión de Venezuela, equivalente en soles. */
  comisionVenezuelaPen: number;
  /** G(bruta): Ms × (Ta/Tv - 1). */
  gananciaBrutaPen: number;
  /** G(neta): G(bruta) - C1(PEN) - C2(PEN). Ganancia neta del negocio (solo el principal la ve). */
  gananciaNetaPen: number;
  /** %G(bruta): (Ta/Tv - 1) × 100. */
  porcentajeGananciaBruta: number;
  /** %G(neta): (G(neta)/Ms) × 100. */
  porcentajeGananciaNeta: number;
}

/**
 * Si `tasaAdquisicion` no está disponible (operación anterior a que se
 * empezara a registrar Ta, o tasa del día sin publicar todavía), no se puede
 * calcular Ganancia Bruta/Neta -- devuelve null en vez de un número
 * engañoso.
 */
export function calcularGananciaOperacion(
  montoPen: number,
  tasaVenta: number,
  tasaAdquisicion: number | null | undefined,
  comisionPeruPct: number,
  comisionVenezuelaPct: number
): GananciaOperacion | null {
  if (!tasaAdquisicion || !tasaVenta || !montoPen) return null;

  const beneficiarioVes = montoPen * tasaVenta;
  const totalEnviadoVes = beneficiarioVes / (1 - comisionVenezuelaPct);
  const comisionVenezuelaVes = totalEnviadoVes * comisionVenezuelaPct;
  const comisionVenezuelaPen = comisionVenezuelaVes / tasaAdquisicion;
  const comisionPeruPen = montoPen * comisionPeruPct;
  const gananciaBrutaPen = montoPen * (tasaAdquisicion / tasaVenta - 1);
  const gananciaNetaPen = gananciaBrutaPen - comisionPeruPen - comisionVenezuelaPen;

  return {
    beneficiarioVes: Number(beneficiarioVes.toFixed(2)),
    transferenciaTotalVes: Number(totalEnviadoVes.toFixed(2)),
    comisionPeruPen: Number(comisionPeruPen.toFixed(2)),
    comisionVenezuelaVes: Number(comisionVenezuelaVes.toFixed(2)),
    comisionVenezuelaPen: Number(comisionVenezuelaPen.toFixed(2)),
    gananciaBrutaPen: Number(gananciaBrutaPen.toFixed(2)),
    gananciaNetaPen: Number(gananciaNetaPen.toFixed(2)),
    porcentajeGananciaBruta: Number(((tasaAdquisicion / tasaVenta - 1) * 100).toFixed(2)),
    porcentajeGananciaNeta: montoPen ? Number(((gananciaNetaPen / montoPen) * 100).toFixed(2)) : 0,
  };
}
