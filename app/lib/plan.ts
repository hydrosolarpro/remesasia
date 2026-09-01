export const PRECIO_STARTER_MENSUAL = 100;
export const PRECIO_PRO_MENSUAL = 200;
export const PRECIO_EXPERT_MENSUAL = 400;
export const PRECIO_AVANCE_MENSUAL = 600;
export const PRECIO_ULTRA_MENSUAL = 1000;

// UNLIMITED no tiene precio fijo (monto acordado directamente con el
// administrador), por eso queda fuera de este mapa -- ver
// requiereMontoManual en FormularioSolicitudPlan.
export const PRECIO_PLAN: Record<string, number> = {
  demo: 0,
  starter: PRECIO_STARTER_MENSUAL,
  pro: PRECIO_PRO_MENSUAL,
  expert: PRECIO_EXPERT_MENSUAL,
  avance: PRECIO_AVANCE_MENSUAL,
  ultra: PRECIO_ULTRA_MENSUAL,
};

export const NOMBRE_PLAN: Record<string, string> = {
  demo: 'DEMO',
  starter: 'STARTER',
  pro: 'PRO',
  expert: 'EXPERT',
  avance: 'AVANCE',
  ultra: 'ULTRA',
  unlimited: 'UNLIMITED',
  medida: 'A LA MEDIDA',
};

// PLAN A LA MEDIDA: la suscripción mensual se calcula sola -- N° de
// clientes que el operador solicita × S/ 1 / mes. Las "características"
// (cupos de equipo Perú/Venezuela y contenido) se heredan del tramo
// estándar equivalente a ese N° de clientes. Más de 1000 clientes no
// tiene tramo: se deriva a UNLIMITED (tarifa acordada con el admin).
export const PRECIO_MEDIDA_POR_CLIENTE = 1;

export function precioPlanMedida(nClientes: number): number {
  return Math.max(0, Math.round(nClientes)) * PRECIO_MEDIDA_POR_CLIENTE;
}

// Tramo estándar cuyas características hereda un plan a la medida para un
// N° de clientes dado. `null` = por encima de ULTRA (más de 1000): sin
// tramo, se ofrece UNLIMITED.
//   1 – 100 -> starter | 101 – 200 -> pro | 201 – 400 -> expert
//   401 – 600 -> avance | 601 – 1000 -> ultra | > 1000 -> null
export function tramoPlanMedida(nClientes: number): string | null {
  const n = Math.round(nClientes);
  if (n <= 0) return null;
  if (n <= 100) return 'starter';
  if (n <= 200) return 'pro';
  if (n <= 400) return 'expert';
  if (n <= 600) return 'avance';
  if (n <= 1000) return 'ultra';
  return null;
}

export function planDesdeMonto(monto: number): string {
  if (monto === 0) return 'demo';
  if (monto === 100) return 'starter';
  if (monto === 200) return 'pro';
  if (monto === 400) return 'expert';
  if (monto === 600) return 'avance';
  if (monto === 1000) return 'ultra';
  return 'unlimited'; // Monto que no calza con ningún plan fijo: acordado con el administrador.
}

export function planLabel(plan: string, monto?: number): string {
  if ((plan === 'unlimited' || plan === 'medida') && monto) return `${NOMBRE_PLAN[plan]} (S/ ${monto})`;
  return NOMBRE_PLAN[plan] ?? plan.toUpperCase();
}

export function planPrecioLabel(plan: string, monto?: number): string {
  if ((plan === 'unlimited' || plan === 'medida') && monto) return `S/ ${monto}/mes`;
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
  // 'medida' no tiene límites fijos: dependen del N° de clientes pactado.
  // Esta entrada solo es un piso de respaldo (equivale a STARTER) para
  // llamadas que no pasan el N -- lo normal es que obtenerLimitesPlan
  // enrute a limitesPlanMedida(nClientes).
  medida: { clientes: 100, peru: 4, venezuela: 2 },
};

// Cupos de un plan a la medida para un N° de clientes dado: el cupo de
// clientes es exactamente N, y el equipo Perú/Venezuela hereda el del
// tramo estándar equivalente (ULTRA como piso si N supera 1000).
export function limitesPlanMedida(nClientes: number): { clientes: number; peru: number; venezuela: number } {
  const tramo = tramoPlanMedida(nClientes) ?? 'ultra';
  const equipo = LIMITES_PLAN[tramo];
  return { clientes: Math.max(0, Math.round(nClientes)), peru: equipo.peru, venezuela: equipo.venezuela };
}

// Orden de planes de menor a mayor, para calcular "próxima meta" (los
// siguientes planes por encima del actual).
export const ORDEN_PLANES = ['demo', 'starter', 'pro', 'expert', 'avance', 'ultra', 'unlimited'];

// `limiteClientesUnlimited`: cupo de clientes acordado caso por caso para
// el plan UNLIMITED (no es literalmente ilimitado en la práctica del
// negocio -- ver 0090_limite_clientes_unlimited.sql). Solo se usa cuando
// plan === 'unlimited' y viene definido; el resto de los planes ignoran
// este parámetro.
export function obtenerLimitesPlan(plan: string, limiteClientesUnlimited?: number | null) {
  // 'medida': la misma columna limite_clientes_unlimited guarda el N°
  // de clientes pactado -- de ahí salen todos los cupos.
  if (plan === 'medida') {
    return limitesPlanMedida(limiteClientesUnlimited ?? LIMITES_PLAN.medida.clientes);
  }
  const base = LIMITES_PLAN[plan] ?? LIMITES_PLAN.demo;
  if (plan === 'unlimited' && limiteClientesUnlimited) {
    return { ...base, clientes: limiteClientesUnlimited };
  }
  return base;
}

export function obtenerLimiteClientes(plan: string, limiteClientesUnlimited?: number | null): number {
  return obtenerLimitesPlan(plan, limiteClientesUnlimited).clientes;
}

export function obtenerLimitesEquipo(
  plan: string,
  limiteClientesUnlimited?: number | null
): { peru: number; venezuela: number } {
  const { peru, venezuela } = obtenerLimitesPlan(plan, limiteClientesUnlimited);
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

export const DIAS_PLAN_PAGADO = 30; // Todos los planes pagados duran exactamente 30 días.

// Ciclo de un plan pagado: arranca en el momento exacto en que el admin
// valida el pago (usuarios.plan_inicio) y dura 30 días -- ahí se debe
// renovar o cambiar de plan. Mismo patrón que diasRestantesDemo/
// demoVencido de arriba, solo que anclado a plan_inicio en vez de
// demo_inicio.
export function fechaFinPlanPagado(planInicio: string): Date {
  return new Date(new Date(planInicio).getTime() + DIAS_PLAN_PAGADO * MS_POR_DIA);
}

export function diasRestantesPlanPagado(planInicio: string | null | undefined): number {
  if (!planInicio) return 0;
  const transcurridos = Math.floor((Date.now() - new Date(planInicio).getTime()) / MS_POR_DIA);
  return Math.max(0, DIAS_PLAN_PAGADO - transcurridos);
}

export function planPagadoVencido(planInicio: string | null | undefined): boolean {
  return diasRestantesPlanPagado(planInicio) <= 0;
}

// A partir de cuántos días restantes se muestra el aviso de renovación
// (ver perfil.tsx, tarjeta "TU PLAN").
export const DIAS_AVISO_RENOVACION = 3;

export function debeAvisarRenovacion(planInicio: string | null | undefined): boolean {
  const dias = diasRestantesPlanPagado(planInicio);
  return dias > 0 && dias <= DIAS_AVISO_RENOVACION;
}
