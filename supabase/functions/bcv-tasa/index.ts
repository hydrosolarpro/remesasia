import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Tasa oficial BCV (USD/EUR a VES), scrapeada de bcv.org.ve bajo demanda.
 * bcv.org.ve no tiene API pública — esto es HTML scraping, inherentemente
 * frágil si el sitio cambia de estructura. Por eso todo se cachea en
 * `tasa_bcv`: si el scraping falla, se devuelve el último valor conocido
 * (con su fecha) en vez de romper la calculadora del cliente.
 */
const HORAS_CACHE_VALIDO = 6;
const URL_BCV = 'https://www.bcv.org.ve/';

// bcv.org.ve sirve una cadena TLS incompleta (falta este intermediate),
// lo que hace que el validador estricto de Deno rechace la conexión con
// "UnknownIssuer" aunque el certificado sea válido (los navegadores lo
// resuelven solos vía AIA chasing; Deno no). Se lo damos a mano para
// completar la cadena — no baja la seguridad, solo agrega la CA que
// falta. Fuente: AIA del propio certificado de bcv.org.ve (Sectigo).
const SECTIGO_DV_R36_INTERMEDIATE = `-----BEGIN CERTIFICATE-----
MIIGTDCCBDSgAwIBAgIQOXpmzCdWNi4NqofKbqvjsTANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNMzYwMzIxMjM1OTU5WjBgMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgRFYgUjM2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEAljZf2HIz7+SPUPQCQObZYcrxLTHYdf1ZtMRe7Yeq
RPSwygz16qJ9cAWtWNTcuICc++p8Dct7zNGxCpqmEtqifO7NvuB5dEVexXn9RFFH
12Hm+NtPRQgXIFjx6MSJcNWuVO3XGE57L1mHlcQYj+g4hny90aFh2SCZCDEVkAja
EMMfYPKuCjHuuF+bzHFb/9gV8P9+ekcHENF2nR1efGWSKwnfG5RawlkaQDpRtZTm
M64TIsv/r7cyFO4nSjs1jLdXYdz5q3a4L0NoabZfbdxVb+CUEHfB0bpulZQtH1Rv
38e/lIdP7OTTIlZh6OYL6NhxP8So0/sht/4J9mqIGxRFc0/pC8suja+wcIUna0HB
pXKfXTKpzgis+zmXDL06ASJf5E4A2/m+Hp6b84sfPAwQ766rI65mh50S0Di9E3Pn
2WcaJc+PILsBmYpgtmgWTR9eV9otfKRUBfzHUHcVgarub/XluEpRlTtZudU5xbFN
xx/DgMrXLUAPaI60fZ6wA+PTAgMBAAGjggGBMIIBfTAfBgNVHSMEGDAWgBRWc1hk
lfmSGrASKgRieaFAFYghSTAdBgNVHQ4EFgQUaMASFhgOr872h6YyV6NGUV3LBycw
DgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0lBBYwFAYI
KwYBBQUHAwEGCCsGAQUFBwMCMBsGA1UdIAQUMBIwBgYEVR0gADAIBgZngQwBAgEw
VAYDVR0fBE0wSzBJoEegRYZDaHR0cDovL2NybC5zZWN0aWdvLmNvbS9TZWN0aWdv
UHVibGljU2VydmVyQXV0aGVudGljYXRpb25Sb290UjQ2LmNybDCBhAYIKwYBBQUH
AQEEeDB2ME8GCCsGAQUFBzAChkNodHRwOi8vY3J0LnNlY3RpZ28uY29tL1NlY3Rp
Z29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYucDdjMCMGCCsGAQUF
BzABhhdodHRwOi8vb2NzcC5zZWN0aWdvLmNvbTANBgkqhkiG9w0BAQwFAAOCAgEA
YtOC9Fy+TqECFw40IospI92kLGgoSZGPOSQXMBqmsGWZUQ7rux7cj1du6d9rD6C8
ze1B2eQjkrGkIL/OF1s7vSmgYVafsRoZd/IHUrkoQvX8FZwUsmPu7amgBfaY3g+d
q1x0jNGKb6I6Bzdl6LgMD9qxp+3i7GQOnd9J8LFSietY6Z4jUBzVoOoz8iAU84OF
h2HhAuiPw1ai0VnY38RTI+8kepGWVfGxfBWzwH9uIjeooIeaosVFvE8cmYUB4TSH
5dUyD0jHct2+8ceKEtIoFU/FfHq/mDaVnvcDCZXtIgitdMFQdMZaVehmObyhRdDD
4NQCs0gaI9AAgFj4L9QtkARzhQLNyRf87Kln+YU0lgCGr9HLg3rGO8q+Y4ppLsOd
unQZ6ZxPNGIfOApbPVf5hCe58EZwiWdHIMn9lPP6+F404y8NNugbQixBber+x536
WrZhFZLjEkhp7fFXf9r32rNPfb74X/U90Bdy4lzp3+X1ukh1BuMxA/EEhDoTOS3l
7ABvc7BYSQubQ2490OcdkIzUh3ZwDrakMVrbaTxUM2p24N6dB+ns2zptWCva6jzW
r8IWKIMxzxLPv5Kt3ePKcUdvkBU/smqujSczTzzSjIoR5QqQA6lN1ZRSnuHIWCvh
JEltkYnTAH41QJ6SAWO66GrrUESwN/cgZzL4JLEqz1Y=
-----END CERTIFICATE-----`;

const clienteBcv = Deno.createHttpClient({ caCerts: [SECTIGO_DV_R36_INTERMEDIATE] });

Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  const supabase = supabaseAdmin();

  const { data: ultima } = await supabase
    .from('tasa_bcv')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultima && horasDesde(ultima.fetched_at) < HORAS_CACHE_VALIDO) {
    return json({ ...ultima, desde_cache: true });
  }

  try {
    const fresca = await scrapearBcv();
    const { data: guardada, error } = await supabase.from('tasa_bcv').insert(fresca).select().single();
    if (error) throw error;
    return json({ ...guardada, desde_cache: false });
  } catch (err) {
    console.error('Error scrapeando BCV:', err);
    if (ultima) {
      // Sitio caído o cambió de estructura: devolvemos el último valor
      // conocido en vez de dejar la calculadora sin tasa.
      return json({ ...ultima, desde_cache: true, advertencia: 'No se pudo actualizar; se muestra el último valor conocido.' });
    }
    return json({ error: 'No se pudo obtener la tasa BCV y no hay ningún valor en caché.' }, 500);
  }
});

async function scrapearBcv(): Promise<{ fecha: string; usd_ves: number; eur_ves: number }> {
  const respuesta = await fetch(URL_BCV, { headers: { 'User-Agent': 'Mozilla/5.0' }, client: clienteBcv });
  if (!respuesta.ok) throw new Error(`BCV respondió ${respuesta.status}`);
  const html = await respuesta.text();

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const usd = extraerValor(doc, 'dolar') ?? extraerValorPorTexto(html, 'USD');
  const eur = extraerValor(doc, 'euro') ?? extraerValorPorTexto(html, 'EUR');

  if (!usd || !eur) throw new Error('No se encontraron las tasas USD/EUR en el HTML de bcv.org.ve');

  return { fecha: new Date().toISOString().slice(0, 10), usd_ves: usd, eur_ves: eur };
}

// deno-lint-ignore no-explicit-any
function extraerValor(doc: any, id: string): number | null {
  const contenedor = doc?.querySelector(`#${id}`);
  const texto = contenedor?.querySelector('strong')?.textContent ?? contenedor?.textContent;
  return parsearNumeroVe(texto);
}

function extraerValorPorTexto(html: string, moneda: string): number | null {
  const patron = new RegExp(`${moneda}[\\s\\S]{0,80}?([\\d.,]{4,})`, 'i');
  const match = html.match(patron);
  return match ? parsearNumeroVe(match[1]) : null;
}

function parsearNumeroVe(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpio = texto.trim().replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(limpio);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

function horasDesde(fechaIso: string): number {
  return (Date.now() - new Date(fechaIso).getTime()) / 3_600_000;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
