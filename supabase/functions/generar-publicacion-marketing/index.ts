import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { supabaseCaller } from '../_shared/supabaseCaller.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Automarketing — genera una publicación para redes sociales:
 *   1. imagen con Pollinations.ai (GET a image.pollinations.ai)
 *   2. texto persuasivo con Groq (llama-3.3-70b-versatile)
 *
 * Solo la puede invocar el Operador principal de Perú (rol 'operador_peru').
 * La imagen se descarga y se re-sube al bucket `comprobantes` (path
 * marketing/<uid>/<uuid>.jpg) para que la URL sea estable, y se guarda una
 * fila en `publicaciones_marketing` como historial.
 *
 * Nunca se comunican tasas de cambio, comisiones ni precios: eso va en el
 * system prompt de Groq y no depende de este código.
 *
 * Secretos requeridos (Supabase → Edge Functions → Secrets):
 *   - GROQ_API_KEY        (obligatorio)
 *   - POLLINATIONS_TOKEN  (opcional; sube los límites de rate de Pollinations)
 *
 * NOTA: estos catálogos son una copia de app/lib/automarketing.ts — Deno no
 * comparte el árbol de `app/`. Si se editan allá, actualízalos aquí también.
 */
const CONCEPTOS = [
  'familia latina feliz recibiendo dinero',
  'smartphone moderno con app de remesas',
  'conexión entre Perú y Venezuela',
  'manos unidas en señal de apoyo',
  'persona sonriente usando celular',
  'mapa de Perú y Venezuela con corazones',
  'familia reunida celebrando',
  'joven profesional enviando dinero',
];

const ESTILOS = [
  'flat illustration',
  'fotografía realista',
  'estilo minimalista',
  '3d render moderno',
  'diseño geométrico',
  'acuarela artística',
];

const PALETAS = [
  'cálidos y vibrantes',
  'azules y blancos',
  'tonos pastel suaves',
  'rojo y dorado',
  'colores patrios Perú Venezuela',
];

const ENFOQUES = [
  'emocional y familiar',
  'tecnológico y moderno',
  'confianza y seguridad',
  'rapidez y eficiencia',
  'comunidad y apoyo',
];

const TAMANOS: Record<string, { ancho: number; alto: number }> = {
  facebook: { ancho: 1080, alto: 1080 },
  instagram: { ancho: 1080, alto: 1080 },
  tiktok: { ancho: 1080, alto: 1920 },
};

// Modelos de Groq a intentar en orden. Se puede forzar uno con el secreto
// GROQ_MODEL. Si un modelo devuelve "model_not_found" (Groq deja de
// ofrecerlo o la cuenta no tiene acceso), se pasa al siguiente en vez de
// fallar -- así no hay que redeployar cada vez que Groq rota su catálogo.
const GROQ_MODELOS = [
  ...(Deno.env.get('GROQ_MODEL') ? [Deno.env.get('GROQ_MODEL')!] : []),
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'gemma2-9b-it',
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function alAzar<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

const ASPECTO_POR_RED: Record<string, string> = {
  facebook: '1:1',
  instagram: '1:1',
  tiktok: '9:16',
};

// Dimensiones concretas por red (múltiplos de 16) para los generadores que
// piden width/height en vez de un aspecto.
const DIMS_POR_RED: Record<string, { w: number; h: number }> = {
  facebook: { w: 1024, h: 1024 },
  instagram: { w: 1024, h: 1024 },
  tiktok: { w: 768, h: 1344 },
};

function construirPromptImagen(concepto: string, estilo: string, paleta: string): string {
  return (
    `Imagen publicitaria profesional de alta gama para redes sociales de un servicio de ` +
    `remesas de dinero entre Perú y Venezuela. Escena principal: ${concepto}. ` +
    `Estilo visual: ${estilo}. Paleta de colores: ${paleta}. ` +
    `Acabado de agencia creativa: iluminación cuidada, composición equilibrada dejando ` +
    `espacio para texto, aspecto premium, moderno y confiable. Personas latinas reales y ` +
    `expresivas cuando la escena lo pida. Sin ningún texto, sin letras, sin números, sin ` +
    `logotipos ni marcas de agua.`
  );
}

// Genera los bytes de la imagen. Orden de preferencia según qué secreto
// esté configurado:
//   1. Together AI — FLUX  (TOGETHER_API_KEY)   -> calidad pro, gratis
//   2. Google Gemini 2.5 Flash Image (GEMINI_API_KEY)
//   3. Pollinations.ai (sin key)               -> respaldo siempre disponible
async function generarImagenBytes(
  prompt: string,
  redSocial: string
): Promise<{ bytes: Uint8Array; contentType: string; fuente: string }> {
  const togetherKey = Deno.env.get('TOGETHER_API_KEY');
  if (togetherKey) {
    try {
      return await generarConTogether(prompt, redSocial, togetherKey);
    } catch (err) {
      console.error('generar-publicacion-marketing: Together falló —', err);
    }
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (geminiKey) {
    try {
      return await generarConGemini(prompt, redSocial, geminiKey);
    } catch (err) {
      console.error('generar-publicacion-marketing: Gemini falló —', err);
    }
  }

  return await generarConPollinations(prompt, redSocial);
}

async function generarConTogether(
  prompt: string,
  redSocial: string,
  apiKey: string
): Promise<{ bytes: Uint8Array; contentType: string; fuente: string }> {
  const { w, h } = DIMS_POR_RED[redSocial] ?? DIMS_POR_RED.facebook;
  const modelo = Deno.env.get('TOGETHER_MODEL') || 'black-forest-labs/FLUX.1-schnell-Free';
  const resp = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelo,
      prompt,
      width: w,
      height: h,
      steps: 4,
      n: 1,
      response_format: 'b64_json',
    }),
  });
  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error(`Together ${resp.status}: ${detalle}`);
  }
  const data = await resp.json();
  const item = data?.data?.[0];
  const b64: string | undefined = item?.b64_json;
  if (b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, contentType: 'image/jpeg', fuente: 'together' };
  }
  // Algunos endpoints gratis solo devuelven una URL temporal.
  if (item?.url) {
    const img = await fetch(item.url);
    if (!img.ok) throw new Error(`Together URL respondió ${img.status}`);
    return { bytes: new Uint8Array(await img.arrayBuffer()), contentType: 'image/jpeg', fuente: 'together' };
  }
  throw new Error('Together no devolvió imagen');
}

async function generarConGemini(
  prompt: string,
  redSocial: string,
  apiKey: string
): Promise<{ bytes: Uint8Array; contentType: string; fuente: string }> {
  const modelos = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'];
  const aspecto = ASPECTO_POR_RED[redSocial] ?? '1:1';
  let ultimo = '';

  for (const modelo of modelos) {
    // Intento 1 con imageConfig (aspecto correcto); si el modelo no lo
    // acepta (400), intento 2 sin generationConfig.
    for (const conConfig of [true, false]) {
      const body: Record<string, unknown> = { contents: [{ parts: [{ text: prompt }] }] };
      if (conConfig) {
        body.generationConfig = { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspecto } };
      }
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) {
        ultimo = await resp.text().catch(() => '');
        console.error('generar-publicacion-marketing: Gemini', modelo, resp.status, ultimo);
        if (resp.status === 404) break; // ese nombre de modelo no existe -> siguiente modelo
        continue; // 400/429/5xx -> reintenta sin config y luego siguiente modelo
      }
      const data = await resp.json();
      const parts: { inlineData?: { data?: string; mimeType?: string } }[] =
        data?.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p) => p?.inlineData?.data);
      if (!img?.inlineData?.data) {
        ultimo = 'Gemini no devolvió imagen';
        continue;
      }
      const bin = atob(img.inlineData.data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { bytes, contentType: img.inlineData.mimeType ?? 'image/png', fuente: 'gemini' };
    }
  }
  throw new Error(`Gemini sin resultado: ${ultimo}`);
}

// Pollinations es 100% gratis y sin registro. Se prueba primero su modelo
// `gptimage` (acabado más profesional, tipo GPT-Image) y si falla o tarda
// demasiado, se cae a `flux`. `enhance=true` deja que Pollinations mejore
// el prompt antes de generar.
async function generarConPollinations(
  prompt: string,
  redSocial: string
): Promise<{ bytes: Uint8Array; contentType: string; fuente: string }> {
  const { ancho, alto } = TAMANOS[redSocial];
  const token = Deno.env.get('POLLINATIONS_TOKEN');
  const modelos = (Deno.env.get('POLLINATIONS_MODEL') || 'gptimage,flux').split(',').map((m) => m.trim());

  let ultimo = '';
  for (const modelo of modelos) {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${ancho}&height=${alto}&seed=${seed}&nologo=true&enhance=true&private=true&model=${encodeURIComponent(modelo)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 100_000);
    try {
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ctrl.signal,
      });
      if (!resp.ok) {
        ultimo = `Pollinations ${modelo} respondió ${resp.status}`;
        console.error('generar-publicacion-marketing:', ultimo);
        continue;
      }
      const bytes = new Uint8Array(await resp.arrayBuffer());
      if (bytes.byteLength < 1024) {
        ultimo = `Pollinations ${modelo} devolvió una imagen vacía`;
        continue;
      }
      const contentType = resp.headers.get('content-type')?.startsWith('image/')
        ? resp.headers.get('content-type')!
        : 'image/jpeg';
      return { bytes, contentType, fuente: `pollinations/${modelo}` };
    } catch (err) {
      ultimo = `Pollinations ${modelo}: ${err instanceof Error ? err.message : String(err)}`;
      console.error('generar-publicacion-marketing:', ultimo);
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error(ultimo || 'Pollinations no devolvió imagen');
}

Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  try {
    const cuerpo = await req.json().catch(() => ({}));
    const redSocial: string = cuerpo.red_social;
    if (!redSocial || !TAMANOS[redSocial]) {
      return json({ error: 'red_social debe ser facebook, instagram o tiktok' }, 400);
    }

    const caller = supabaseCaller(req);
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) return json({ error: 'No autenticado' }, 401);

    const { data: rolCaller } = await caller.rpc('rol_actual');
    if (rolCaller !== 'operador_peru') {
      return json({ error: 'Solo el Operador principal de Perú puede usar Automarketing' }, 403);
    }

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      return json(
        { error: 'Falta el secreto GROQ_API_KEY en la Edge Function. Configúralo en Supabase → Edge Functions → Secrets.' },
        500
      );
    }

    const admin = supabaseAdmin();

    // Estilo: el pedido explícito manda; si no, el preferido del perfil; si
    // tampoco, uno al azar.
    let estiloPreferido: string | null = null;
    if (!cuerpo.estilo) {
      const { data: perfil } = await admin
        .from('perfil_negocio')
        .select('estilo_marketing_preferido')
        .eq('operador_peru_id', user.id)
        .maybeSingle();
      estiloPreferido = perfil?.estilo_marketing_preferido ?? null;
    }

    const concepto: string = cuerpo.concepto || alAzar(CONCEPTOS);
    const estilo: string = cuerpo.estilo || estiloPreferido || alAzar(ESTILOS);
    const paleta: string = cuerpo.paleta || alAzar(PALETAS);
    const enfoque: string = cuerpo.enfoque || alAzar(ENFOQUES);
    const { ancho, alto } = TAMANOS[redSocial];

    const regenerarSolo: 'imagen' | 'texto' | undefined = cuerpo.regenerar_solo;

    // ── Imagen (Gemini 2.5 Flash Image, con respaldo Pollinations) ───────
    const imagenPrompt = construirPromptImagen(concepto, estilo, paleta);

    let imagenUrl: string = cuerpo.imagen_url_previa ?? '';
    let imagenPromptFinal: string = cuerpo.imagen_prompt_previo ?? imagenPrompt;

    if (regenerarSolo !== 'texto') {
      try {
        const { bytes, contentType } = await generarImagenBytes(imagenPrompt, redSocial);
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const path = `marketing/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await admin.storage
          .from('comprobantes')
          .upload(path, bytes, { contentType, upsert: false });
        if (upErr) throw upErr;
        imagenUrl = `${admin.storage.from('comprobantes').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;
        imagenPromptFinal = imagenPrompt;
      } catch (err) {
        console.error('generar-publicacion-marketing: error de imagen', err);
        if (!imagenUrl) return json({ error: 'No se pudo generar la imagen. Intenta de nuevo.' }, 502);
        // Si era "regenerar imagen" y falló, se conserva la anterior.
      }
    }

    // ── Texto (Groq) ─────────────────────────────────────────────────────
    let texto: string = cuerpo.texto_previo ?? '';

    if (regenerarSolo !== 'imagen') {
      const sistema =
        'Eres un redactor publicitario para un servicio de remesas de dinero de Perú a Venezuela. ' +
        'Escribe SIEMPRE en español neutro. Genera UNA publicación breve para redes sociales ' +
        '(2 a 4 líneas), con emojis moderados y una llamada a la acción al final. ' +
        `Tono: ${enfoque}. Idea visual que acompaña: ${concepto}. ` +
        'PROHIBIDO ABSOLUTAMENTE mencionar tasas de cambio, tipo de cambio, cuánto se recibe, ' +
        'comisiones, precios, montos, porcentajes o cifras de dinero. ' +
        'Comunica solo rapidez, tecnología, confianza y la conexión con la familia. ' +
        'NO escribas URLs, enlaces, números de teléfono ni "wa.me": la app los agrega aparte. ' +
        'Devuelve únicamente el texto de la publicación, sin comillas ni encabezados.';

      let ultimoDetalle = '';
      for (const modelo of GROQ_MODELOS) {
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: modelo,
            temperature: 1.05,
            max_tokens: 400,
            messages: [
              { role: 'system', content: sistema },
              { role: 'user', content: 'Genera la publicación ahora. Debe ser distinta y original.' },
            ],
          }),
        });

        if (groqResp.ok) {
          const data = await groqResp.json();
          const generado: string | undefined = data?.choices?.[0]?.message?.content?.trim();
          if (generado) {
            texto = generado;
            break;
          }
          ultimoDetalle = 'la IA no devolvió contenido';
          continue;
        }

        ultimoDetalle = await groqResp.text().catch(() => '');
        console.error('generar-publicacion-marketing: Groq', modelo, groqResp.status, ultimoDetalle);
        // 404/400 = modelo no disponible en esta cuenta -> probar el siguiente.
        // Cualquier otro error (401 key, 429 rate limit, 5xx) no se arregla
        // cambiando de modelo: se corta acá.
        if (groqResp.status !== 404 && groqResp.status !== 400) break;
      }

      if (!texto) {
        return json({ error: `No se pudo generar el texto (Groq): ${ultimoDetalle || 'sin detalle'}` }, 502);
      }
    }

    // ── Guardar en historial ────────────────────────────────────────────
    const fila = {
      operador_peru_id: user.id,
      red_social: redSocial,
      concepto,
      estilo,
      paleta,
      enfoque,
      imagen_prompt: imagenPromptFinal,
      imagen_url: imagenUrl,
      texto,
      wa_link: cuerpo.wa_link ?? null,
      invitacion_link: cuerpo.invitacion_link ?? null,
      ancho,
      alto,
    };

    const { data: insertada, error: insErr } = await admin
      .from('publicaciones_marketing')
      .insert(fila)
      .select()
      .single();
    if (insErr) {
      console.error('generar-publicacion-marketing: insert', insErr);
      return json({ error: 'No se pudo guardar la publicación.' }, 500);
    }

    return json(insertada);
  } catch (err) {
    console.error('generar-publicacion-marketing: error inesperado', err);
    return json({ error: 'Error inesperado' }, 500);
  }
});
