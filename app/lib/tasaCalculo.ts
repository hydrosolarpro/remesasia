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
