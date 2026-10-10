/**
 * Réplica exacta de `app/lib/formato.ts` -> `formatearBs`. No se puede
 * importar directo porque esa carpeta vive fuera del bundle de las Edge
 * Functions (cada función en `supabase/functions/*` se despliega desde su
 * propia carpeta), así que se mantiene esta copia mínima aquí.
 */
export function formatearBs(monto: number): string {
  return monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
