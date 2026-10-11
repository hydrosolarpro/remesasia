import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Tipo de cambio soles -> dólares de SUNAT (Edge Function `sunat-tipo-cambio`,
// con caché diaria en la base). Los precios de los planes están en soles; acá
// se muestra su equivalente en dólares (venta SUNAT).
export interface TipoCambioSunat {
  fecha: string;
  compra: number;
  venta: number;
}

let cache: TipoCambioSunat | null = null;
let enCurso: Promise<void> | null = null;
const oyentes = new Set<() => void>();

function cargar(): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sunat-tipo-cambio');
      if (!error && data && Number(data.venta) > 0) {
        cache = { fecha: data.fecha, compra: Number(data.compra), venta: Number(data.venta) };
        oyentes.forEach((fn) => fn());
      }
    } catch {
      /* sin tipo de cambio: se muestran solo soles */
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

export function useTipoCambioSunat(): TipoCambioSunat | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    oyentes.add(fn);
    if (!cache) cargar();
    return () => {
      oyentes.delete(fn);
    };
  }, []);
  return cache;
}

export function solesADolares(soles: number, tc: TipoCambioSunat | null): number | null {
  return tc && tc.venta > 0 ? soles / tc.venta : null;
}
