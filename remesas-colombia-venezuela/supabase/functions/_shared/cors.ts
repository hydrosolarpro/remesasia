/**
 * Headers CORS para Edge Functions invocadas directo desde la app (web y
 * apps nativas empaquetadas como origen "null" también los necesitan).
 * Sin esto el navegador bloquea la respuesta antes de que el código de la
 * app la vea — no aparece como error de red explícito, solo falla en
 * silencio si el caller atrapa la excepción genéricamente.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function manejarPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
