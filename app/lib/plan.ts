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

export const LIMITE_CLIENTES = 100;
export const LIMITE_EQUIPO_PERU = 1;
export const LIMITE_EQUIPO_VENEZUELA = 2;

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
