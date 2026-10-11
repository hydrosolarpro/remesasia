import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Tipo de cambio SOLES -> DÓLARES (SUNAT). Los precios de los planes están en
// soles; acá se obtiene el tipo de cambio de SUNAT del día (Edge Function
// `sunat-tipo-cambio`, que lo cachea en `tasa_sunat`) para mostrar su
// equivalente en dólares. Se usa el valor de VENTA (cuántos soles cuesta 1
// dólar): US$ = S/ ÷ venta.
export interface TipoCambioSunat {
  fecha: string;
  compra: number;
  venta: number;
}

let cache: TipoCambioSunat | null = null;
let ultimaCarga = 0;
let enCurso: Promise<void> | null = null;
const oyentes = new Set<() => void>();
const HORAS_REFRESCO = 6;

export function tipoCambioActual(): TipoCambioSunat | null {
  return cache;
}

/** Equivalente en dólares de un monto en soles (o null si todavía no hay tipo de cambio). */
export function solesADolares(soles: number): number | null {
  return cache && cache.venta > 0 ? soles / cache.venta : null;
}

/** " (≈ US$ 28.93)" -- cadena vacía si todavía no hay tipo de cambio. */
export function usdTxt(soles: number): string {
  const u = solesADolares(soles);
  return u === null ? '' : ` (≈ US$ ${u.toFixed(2)})`;
}

function cargar(): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sunat-tipo-cambio');
      if (!error && data && Number(data.venta) > 0) {
        cache = { fecha: data.fecha, compra: Number(data.compra), venta: Number(data.venta) };
        ultimaCarga = Date.now();
        oyentes.forEach((fn) => fn());
      }
    } catch {
      /* sin tipo de cambio: los precios se muestran solo en soles */
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

/** Hook: carga (o refresca cada 6 h) el tipo de cambio y vuelve a renderizar cuando llega. */
export function useTipoCambioSunat(): TipoCambioSunat | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    oyentes.add(fn);
    if (!cache || Date.now() - ultimaCarga > HORAS_REFRESCO * 3600 * 1000) cargar();
    return () => {
      oyentes.delete(fn);
    };
  }, []);
  return cache;
}
