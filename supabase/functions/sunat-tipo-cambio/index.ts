import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Tipo de cambio soles/dólares de SUNAT, por día, con caché en `tasa_sunat`.
 * Fuente oficial: https://www.sunat.gob.pe/a/txt/tipoCambio.txt
 *   formato: "dd/mm/aaaa|compra|venta|"
 * Respaldo si SUNAT no responde: api.apis.net.pe (réplica del tipo de cambio
 * SUNAT). Si ambas fallan se devuelve el último valor guardado.
 */
const HORAS_CACHE_VALIDO = 6;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

const horasDesde = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

async function desdeSunat(): Promise<{ fecha: string; compra: number; venta: number }> {
  const r = await fetch('https://www.sunat.gob.pe/a/txt/tipoCambio.txt', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!r.ok) throw new Error(`SUNAT HTTP ${r.status}`);
  const [f, c, v] = (await r.text()).trim().split('|');
  const [dd, mm, aaaa] = f.split('/');
  const compra = Number(c);
  const venta = Number(v);
  if (!(compra > 0) || !(venta > 0) || !dd || !mm || !aaaa) throw new Error('Formato SUNAT inesperado');
  return { fecha: `${aaaa}-${mm}-${dd}`, compra, venta };
}

async function desdeRespaldo(): Promise<{ fecha: string; compra: number; venta: number }> {
  const r = await fetch('https://api.apis.net.pe/v1/tipo-cambio-sunat', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`Respaldo HTTP ${r.status}`);
  const d = await r.json();
  if (!(Number(d.compra) > 0) || !(Number(d.venta) > 0) || !d.fecha) throw new Error('Respaldo inválido');
  return { fecha: d.fecha, compra: Number(d.compra), venta: Number(d.venta) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: ultima } = await supabase
    .from('tasa_sunat')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultima && horasDesde(ultima.fetched_at) < HORAS_CACHE_VALIDO) {
    return json({ ...ultima, desde_cache: true });
  }

  try {
    let fresca;
    try {
      fresca = await desdeSunat();
    } catch (e) {
      console.error('sunat-tipo-cambio: SUNAT falló, uso respaldo', e);
      fresca = await desdeRespaldo();
    }
    const { data: guardada, error } = await supabase
      .from('tasa_sunat')
      .upsert({ ...fresca, fetched_at: new Date().toISOString() }, { onConflict: 'fecha' })
      .select()
      .single();
    if (error) throw error;
    return json({ ...guardada, desde_cache: false });
  } catch (err) {
    console.error('sunat-tipo-cambio: no se pudo actualizar', err);
    if (ultima) return json({ ...ultima, desde_cache: true, advertencia: 'Se muestra el último valor conocido.' });
    return json({ error: 'No se pudo obtener el tipo de cambio SUNAT.' }, 500);
  }
});
