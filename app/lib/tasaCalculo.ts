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
// Ms=montoPen, Tv=tasaVenta, Ta=tasaAdquisicion, C1/C2=comisiones (0.20 = 20%).
// Las comisiones son un % de la GANANCIA BRUTA de la operación (no del
// monto enviado): el negocio reparte lo que gana, y la Ganancia Neta del
// principal es lo que queda después de pagarlas.
export interface GananciaOperacion {
  /** B: bolívares que recibe el beneficiario (Ms × Tv). */
  beneficiarioVes: number;
  /** T: total que el remesero envía a Venezuela (B + comisión Vzla en bolívares). Nunca se mezcla con B. */
  transferenciaTotalVes: number;
  /** C1(PEN): comisión del operador de Perú que atendió = G(bruta) × C1. */
  comisionPeruPen: number;
  /** C2(VES): comisión del Operador Venezuela que atendió, en bolívares = C2(PEN) × Ta. */
  comisionVenezuelaVes: number;
  /** C2(PEN): comisión del Operador Venezuela = G(bruta) × C2. */
  comisionVenezuelaPen: number;
  /**
   * G(bruta): Ms × (1 - Tv/Ta). Lo cobrado (Ms) menos lo que cuesta comprar
   * los bolívares del beneficiario (B/Ta).
   */
  gananciaBrutaPen: number;
  /** G(neta): G(bruta) - C1(PEN) - C2(PEN). Ganancia neta del principal (solo él la ve). */
  gananciaNetaPen: number;
  /** %G(bruta): (1 - Tv/Ta) × 100. */
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

  // Cada monto se redondea a céntimos ANTES de restar, para que lo que se
  // muestra cuadre exacto: G(neta) = G(bruta) - C1 - C2 al céntimo.
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const beneficiarioVes = r2(montoPen * tasaVenta);
  const gananciaBrutaPen = r2(montoPen * (1 - tasaVenta / tasaAdquisicion));
  // Si la operación no deja ganancia (Tv >= Ta), no hay nada que repartir:
  // las comisiones quedan en 0 y la pérdida la asume el principal.
  const baseComision = Math.max(gananciaBrutaPen, 0);
  const comisionPeruPen = r2(baseComision * comisionPeruPct);
  const comisionVenezuelaPen = r2(baseComision * comisionVenezuelaPct);
  const comisionVenezuelaVes = r2(comisionVenezuelaPen * tasaAdquisicion);
  const totalEnviadoVes = r2(beneficiarioVes + comisionVenezuelaVes);
  const gananciaNetaPen = r2(gananciaBrutaPen - comisionPeruPen - comisionVenezuelaPen);

  return {
    beneficiarioVes,
    transferenciaTotalVes: totalEnviadoVes,
    comisionPeruPen,
    comisionVenezuelaVes,
    comisionVenezuelaPen,
    gananciaBrutaPen,
    gananciaNetaPen,
    porcentajeGananciaBruta: Number(((1 - tasaVenta / tasaAdquisicion) * 100).toFixed(2)),
    porcentajeGananciaNeta: montoPen ? Number(((gananciaNetaPen / montoPen) * 100).toFixed(2)) : 0,
  };
}
