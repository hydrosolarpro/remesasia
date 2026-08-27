import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { PlanOperador } from '../types/database';

/** Renovación/cambio de plan pagado por adelantado, todavía sin activarse (ver cambios_plan_pendientes). */
export interface CambioPendienteInfo {
  id: string;
  planSolicitado: string;
  estado: 'pendiente' | 'verificado';
  monto: number;
  /** UNLIMITED consultado pero el admin todavía no fija la tarifa -- ver FormularioSolicitudPlan/panel-control.tsx. */
  montoPorDefinir: boolean;
  comprobanteUrl: string | null;
}

export interface EstadoPlanNegocio {
  cargando: boolean;
  plan: PlanOperador | null;
  demoInicio: string | null;
  /** Momento exacto en que se activó el plan pagado vigente -- ancla su ciclo de 30 días. */
  planInicio: string | null;
  cambioPendiente: CambioPendienteInfo | null;
}

const ESTADO_VACIO: EstadoPlanNegocio = { cargando: true, plan: null, demoInicio: null, planInicio: null, cambioPendiente: null };

// Lee el plan/fecha de inicio del DEMO, el inicio del ciclo del plan
// pagado vigente, y si hay una renovación/cambio de plan ya pagada en
// espera de activarse, del Operador Perú dueño de un negocio, dado su
// id. Usado para la insignia del header (Operador Perú y Operador
// Venezuela) y para mostrar el estado del plan en Perfil.
export function useEstadoPlanNegocio(operadorPeruId: string | null | undefined): EstadoPlanNegocio {
  const [estado, setEstado] = useState<EstadoPlanNegocio>(ESTADO_VACIO);

  useEffect(() => {
    if (!operadorPeruId) {
      setEstado({ ...ESTADO_VACIO, cargando: false });
      return;
    }
    let cancelado = false;
    setEstado((e) => ({ ...e, cargando: true }));
    Promise.all([
      supabase.from('usuarios').select('plan, demo_inicio, plan_inicio').eq('id', operadorPeruId).maybeSingle(),
      supabase
        .from('cambios_plan_pendientes')
        .select('id, plan_solicitado, estado, monto, monto_por_definir, comprobante_url')
        .eq('operador_peru_id', operadorPeruId)
        .neq('estado', 'rechazado')
        .is('activado_at', null)
        .maybeSingle(),
    ]).then(([{ data }, { data: cambio }]) => {
      if (cancelado) return;
      setEstado({
        cargando: false,
        plan: (data?.plan as PlanOperador | undefined) ?? null,
        demoInicio: data?.demo_inicio ?? null,
        planInicio: data?.plan_inicio ?? null,
        cambioPendiente: cambio
          ? {
              id: cambio.id,
              planSolicitado: cambio.plan_solicitado,
              estado: cambio.estado as 'pendiente' | 'verificado',
              monto: cambio.monto,
              montoPorDefinir: cambio.monto_por_definir,
              comprobanteUrl: cambio.comprobante_url,
            }
          : null,
      });
    });
    return () => {
      cancelado = true;
    };
  }, [operadorPeruId]);

  return estado;
}
