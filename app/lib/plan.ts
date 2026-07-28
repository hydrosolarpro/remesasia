// Plan DEMO (gratis, 15 días desde `demo_inicio`) vs STARTER (pagado,
// S/ {PRECIO_STARTER_MENSUAL}/mes, vía pagos_suscripcion + aprobación del
// admin). Antes el monto era editable desde el panel del admin
// (`configuracion_pagos_admin.monto_suscripcion`) — ahora es un precio fijo
// de la plataforma, así que vive acá como constante.
export const PRECIO_STARTER_MENSUAL = 100;

export const DIAS_DEMO = 15;

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
