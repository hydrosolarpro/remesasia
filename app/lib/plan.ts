export const PRECIO_STARTER_MENSUAL = 100;
export const PRECIO_PRO_MENSUAL = 200;
export const PRECIO_EXPERT_MENSUAL = 300;
export const PRECIO_AVANCE_MENSUAL = 500;

export const PRECIO_PLAN: Record<string, number> = {
  demo: 0,
  starter: PRECIO_STARTER_MENSUAL,
  pro: PRECIO_PRO_MENSUAL,
  expert: PRECIO_EXPERT_MENSUAL,
  avance: PRECIO_AVANCE_MENSUAL,
};

export const NOMBRE_PLAN: Record<string, string> = {
  demo: 'DEMO',
  starter: 'STARTER',
  pro: 'PRO',
  expert: 'EXPERT',
  avance: 'AVANCE',
  ultra: 'ULTRA',
  unlimited: 'UNLIMITED',
};

export function planDesdeMonto(monto: number): string {
  if (monto === 0) return 'demo';
  if (monto === 100) return 'starter';
  if (monto === 200) return 'pro';
  if (monto === 300) return 'expert';
  if (monto === 500) return 'avance';
  return 'ultra';
}

export function planLabel(plan: string, monto?: number): string {
  if (plan === 'ultra' && monto) return `ULTRA (S/ ${monto})`;
  return NOMBRE_PLAN[plan] ?? plan.toUpperCase();
}

export function planPrecioLabel(plan: string, monto?: number): string {
  if (plan === 'ultra' && monto) return `S/ ${monto}/mes`;
  const p = PRECIO_PLAN[plan];
  return p !== undefined ? `S/ ${p}/mes` : '';
}

export const DIAS_DEMO = 7;

// Límites de cada plan (clientes finales, operadores en Perú y en
// Venezuela) según "SOBRE PLANES Y PAGOS/sobre-planes.md" — fuente de
// verdad de contenido y precios de cada plan. UNLIMITED no tiene tope fijo
// ("acordado con el administrador"), se representa con Infinity para que
// las comparaciones (`>=` límite) nunca disparen el aviso de cupo.
export const LIMITES_PLAN: Record<string, { clientes: number; peru: number; venezuela: number }> = {
  demo: { clientes: 50, peru: 3, venezuela: 2 },
  starter: { clientes: 100, peru: 4, venezuela: 2 },
  pro: { clientes: 200, peru: 6, venezuela: 3 },
  expert: { clientes: 400, peru: 10, venezuela: 5 },
  avance: { clientes: 600, peru: 15, venezuela: 8 },
  ultra: { clientes: 1000, peru: 20, venezuela: 10 },
  unlimited: { clientes: Infinity, peru: Infinity, venezuela: Infinity },
};

// Orden de planes de menor a mayor, para calcular "próxima meta" (los
// siguientes planes por encima del actual).
export const ORDEN_PLANES = ['demo', 'starter', 'pro', 'expert', 'avance', 'ultra', 'unlimited'];

export function obtenerLimitesPlan(plan: string) {
  return LIMITES_PLAN[plan] ?? LIMITES_PLAN.demo;
}

export function obtenerLimiteClientes(plan: string): number {
  return obtenerLimitesPlan(plan).clientes;
}

export function obtenerLimitesEquipo(plan: string): { peru: number; venezuela: number } {
  const { peru, venezuela } = obtenerLimitesPlan(plan);
  return { peru, venezuela };
}

// Los dos planes siguientes al actual (para la sección "Próxima Meta" del
// Perfil del Operador Perú). Si ya está en el plan más alto, devuelve [].
export function siguientesPlanes(plan: string, cantidad = 2): string[] {
  const indiceActual = ORDEN_PLANES.indexOf(plan);
  if (indiceActual === -1) return ORDEN_PLANES.slice(1, 1 + cantidad);
  return ORDEN_PLANES.slice(indiceActual + 1, indiceActual + 1 + cantidad);
}

const MS_POR_DIA = 86_400_000;

export function diasRestantesDemo(demoInicio: string | null | undefined): number {
  if (!demoInicio) return 0;
  const transcurridos = Math.floor((Date.now() - new Date(demoInicio).getTime()) / MS_POR_DIA);
  return Math.max(0, DIAS_DEMO - transcurridos);
}

export function fechaFinDemo(demoInicio: string): Date {
  return new Date(new Date(demoInicio).getTime() + DIAS_DEMO * MS_POR_DIA);
}

export function demoVencido(demoInicio: string | null | undefined): boolean {
  return diasRestantesDemo(demoInicio) <= 0;
}

const DIAS_PLAN_PAGADO = 30; // Todos los planes pagados son mensuales.

// Ciclo mensual de un plan pagado: arranca el primer día del período
// (YYYY-MM) del último pago verificado y dura 30 días -- ahí se debe
// renovar (solicitar y pagar el siguiente período).
export function fechaInicioPeriodo(periodo: string): Date {
  return new Date(`${periodo}-01T00:00:00`);
}

export function fechaVencimientoPeriodo(periodo: string): Date {
  return new Date(fechaInicioPeriodo(periodo).getTime() + DIAS_PLAN_PAGADO * MS_POR_DIA);
}

export function diasRestantesPeriodo(periodo: string | null | undefined): number {
  if (!periodo) return 0;
  const transcurridos = Math.floor((Date.now() - fechaInicioPeriodo(periodo).getTime()) / MS_POR_DIA);
  return Math.max(0, DIAS_PLAN_PAGADO - transcurridos);
}
