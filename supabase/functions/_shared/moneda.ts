/**
 * Moneda de recepción de una solicitud según su corredor
 * (solicitudes.corredor, ver migración 0112). `monto_pen` guarda el monto en
 * la moneda de recepción del corredor, sea PEN, COP, CLP u otra.
 *   PE-VE: PEN (S/) · CO-VE: COP ($) · CL-VE: CLP ($)
 *   OT-VE ("Otro país"): moneda definida por el operador principal en
 *   negocio_corredores (moneda_codigo / moneda_simbolo).
 */
export interface MonedaCorredor {
  codigo: string;
  simbolo: string;
  /** Texto para mensajes: "S/", "COP"... */
  etiqueta: string;
}

const FIJAS: Record<string, MonedaCorredor> = {
  'PE-VE': { codigo: 'PEN', simbolo: 'S/', etiqueta: 'S/' },
  'CO-VE': { codigo: 'COP', simbolo: '$', etiqueta: 'COP' },
  'CL-VE': { codigo: 'CLP', simbolo: '$', etiqueta: 'CLP' },
};

// deno-lint-ignore no-explicit-any
export async function monedaDeSolicitud(supabase: any, solicitud: any): Promise<MonedaCorredor> {
  const corredor: string = solicitud?.corredor ?? 'PE-VE';
  if (FIJAS[corredor]) return FIJAS[corredor];
  if (corredor === 'OT-VE') {
    const { data } = await supabase
      .from('negocio_corredores')
      .select('moneda_codigo, moneda_simbolo')
      .eq('negocio_id', solicitud.negocio_operador_peru_id)
      .eq('corredor', 'OT-VE')
      .maybeSingle();
    const codigo = data?.moneda_codigo || 'USD';
    return { codigo, simbolo: data?.moneda_simbolo || '$', etiqueta: codigo };
  }
  return FIJAS['PE-VE'];
}
