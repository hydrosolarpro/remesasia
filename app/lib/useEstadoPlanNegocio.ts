import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { PlanOperador } from '../types/database';

export interface EstadoPlanNegocio {
  cargando: boolean;
  plan: PlanOperador | null;
  demoInicio: string | null;
  /** Período (YYYY-MM) del último pago verificado -- inicio del ciclo mensual vigente del plan pagado. */
  periodoVerificado: string | null;
}

// Lee el plan/fecha de inicio del DEMO, y el período del último pago
// verificado (para calcular el vencimiento del ciclo mensual de un plan
// pagado), del Operador Perú dueño de un negocio, dado su id. Usado para
// la insignia del header (Operador Perú y Operador Venezuela) y para
// mostrar el estado del plan en Perfil.
export function useEstadoPlanNegocio(operadorPeruId: string | null | undefined): EstadoPlanNegocio {
  const [estado, setEstado] = useState<EstadoPlanNegocio>({ cargando: true, plan: null, demoInicio: null, periodoVerificado: null });

  useEffect(() => {
    if (!operadorPeruId) {
      setEstado({ cargando: false, plan: null, demoInicio: null, periodoVerificado: null });
      return;
    }
    let cancelado = false;
    setEstado((e) => ({ ...e, cargando: true }));
    Promise.all([
      supabase.from('usuarios').select('plan, demo_inicio').eq('id', operadorPeruId).maybeSingle(),
      supabase
        .from('pagos_suscripcion')
        .select('periodo')
        .eq('operador_peru_id', operadorPeruId)
        .eq('estado', 'verificado')
        .order('periodo', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([{ data }, { data: pago }]) => {
      if (cancelado) return;
      setEstado({
        cargando: false,
        plan: (data?.plan as PlanOperador | undefined) ?? null,
        demoInicio: data?.demo_inicio ?? null,
        periodoVerificado: pago?.periodo ?? null,
      });
    });
    return () => {
      cancelado = true;
    };
  }, [operadorPeruId]);

  return estado;
}
