export interface PlanInfo {
  id: string;
  nombre: string;
  precio: number;
  clientes: number;
  operadoresPeru: number;
  operadoresVenezuela: number;
}

// Fuente de verdad: "SOBRE PLANES Y PAGOS/sobre-planes.md" -- los mismos
// números que usa la app real en app/lib/plan.ts (PRECIO_PLAN/LIMITES_PLAN).
// Se duplican acá porque esta landing es un proyecto Vite separado sin
// acceso al código de la app.
export const PLANES: PlanInfo[] = [
  { id: 'starter', nombre: 'STARTER', precio: 100, clientes: 100, operadoresPeru: 4, operadoresVenezuela: 2 },
  { id: 'pro', nombre: 'PRO', precio: 200, clientes: 200, operadoresPeru: 6, operadoresVenezuela: 3 },
  { id: 'expert', nombre: 'EXPERT', precio: 400, clientes: 400, operadoresPeru: 10, operadoresVenezuela: 5 },
  { id: 'avance', nombre: 'AVANCE', precio: 600, clientes: 600, operadoresPeru: 15, operadoresVenezuela: 8 },
  { id: 'ultra', nombre: 'ULTRA', precio: 1000, clientes: 1000, operadoresPeru: 20, operadoresVenezuela: 10 },
];

export const MAX_SLIDER = 1200;

// null = por encima de ULTRA (más de 1000 clientes): no hay un plan fijo,
// se ofrece UNLIMITED (acordado con el administrador, ver sobre-planes.md).
export function recomendarPlan(clientes: number): PlanInfo | null {
  return PLANES.find((p) => clientes <= p.clientes) ?? null;
}

// PLAN A LA MEDIDA: la suscripción mensual se calcula sola -- N° de
// clientes × S/ 1 / mes -- y las características (cupos de equipo y
// contenido) se heredan del tramo estándar equivalente a ese N° de
// clientes. Más de 1000 clientes: se deriva a UNLIMITED (tarifa acordada
// con el administrador). Mismos números que la app real (app/lib/plan.ts).
export const PRECIO_POR_CLIENTE_MEDIDA = 1;

export function precioAMedida(clientes: number): number {
  return Math.max(0, Math.round(clientes)) * PRECIO_POR_CLIENTE_MEDIDA;
}

// Tramo estándar cuyas características hereda un plan a la medida.
// null = más de 1000 clientes (sin tramo -> UNLIMITED).
export function tramoAMedida(clientes: number): PlanInfo | null {
  if (Math.round(clientes) < 1) return null;
  return PLANES.find((p) => clientes <= p.clientes) ?? null;
}
