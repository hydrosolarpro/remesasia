export interface DesgloseConversion {
  montoPen: number;
  tasaPenUsdt: number;
  tasaUsdtVes: number;
  montoUsdt: number;
  montoVes: number;
}

/**
 * F2 — Calculadora doble PEN→USDT→VES.
 * tasaPenUsdt: cuántos PEN cuesta 1 USDT (ej. 3.80 => 1 USDT = S/3.80)
 * tasaUsdtVes: cuántos VES vale 1 USDT (ej. 130 => 1 USDT = 130 Bs)
 */
export function calcularConversion(
  montoPen: number,
  tasaPenUsdt: number,
  tasaUsdtVes: number
): DesgloseConversion {
  const montoUsdt = montoPen / tasaPenUsdt;
  const montoVes = montoUsdt * tasaUsdtVes;
  return {
    montoPen,
    tasaPenUsdt,
    tasaUsdtVes,
    montoUsdt: Number(montoUsdt.toFixed(2)),
    montoVes: Number(montoVes.toFixed(2)),
  };
}

/**
 * Ganancia = (tasa cobrada al cliente − tasa real de compra en Binance/El Dorado) × monto USDT.
 * Se calcula cuando el Operador Perú registra la tasa real al marcar "USDT enviado".
 */
export function calcularGanancia(tasaCliente: number, tasaReal: number, montoUsdt: number): number {
  return Number(((tasaCliente - tasaReal) * montoUsdt).toFixed(2));
}
