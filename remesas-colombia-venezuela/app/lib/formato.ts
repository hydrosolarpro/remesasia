// Formatea montos en bolívares con coma como separador de miles y punto
// como separador decimal (p.ej. 1234567.5 -> "1,234,567.50"), a pedido
// explícito del negocio -- no usa el formato tradicional venezolano
// (punto de miles / coma decimal).
export function formatearBs(monto: number): string {
  return monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
