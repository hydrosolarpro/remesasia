import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { PlanOperador } from '../types/database';

export interface EstadoPlanNegocio {
  cargando: boolean;
  plan: PlanOperador | null;
  demoInicio: string | null;
}

// Lee el plan/fecha de inicio del DEMO del Operador Perú dueño de un
// negocio, dado su id. Usado para la insignia del header (Operador Perú y
// Operador Venezuela) y para mostrar el estado del plan en Perfil.
export function useEstadoPlanNegocio(operadorPeruId: string | null | undefined): EstadoPlanNegocio {
  const [estado, setEstado] = useState<EstadoPlanNegocio>({ cargando: true, plan: null, demoInicio: null });

  useEffect(() => {
    if (!operadorPeruId) {
      setEstado({ cargando: false, plan: null, demoInicio: null });
      return;
    }
    let cancelado = false;
    setEstado((e) => ({ ...e, cargando: true }));
    supabase
      .from('usuarios')
      .select('plan, demo_inicio')
      .eq('id', operadorPeruId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return;
        setEstado({ cargando: false, plan: (data?.plan as PlanOperador | undefined) ?? null, demoInicio: data?.demo_inicio ?? null });
      });
    return () => {
      cancelado = true;
    };
  }, [operadorPeruId]);

  return estado;
}
