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

    // ── Imagen (Pollinations) ────────────────────────────────────────────
    const imagenPrompt =
      `${concepto}, ${estilo}, colores ${paleta}, ilustración para redes sociales, ` +
      `sin texto, sin letras, alta calidad, composición limpia`;

    let imagenUrl: string = cuerpo.imagen_url_previa ?? '';
    let imagenPromptFinal: string = cuerpo.imagen_prompt_previo ?? imagenPrompt;

    if (regenerarSolo !== 'texto') {
      try {
        const seed = Math.floor(Math.random() * 1_000_000);
        const pollUrl =
          `https://image.pollinations.ai/prompt/${encodeURIComponent(imagenPrompt)}` +
          `?width=${ancho}&height=${alto}&seed=${seed}&nologo=true&model=flux`;
        const pollToken = Deno.env.get('POLLINATIONS_TOKEN');
        const pollResp = await fetch(pollUrl, {
          headers: pollToken ? { Authorization: `Bearer ${pollToken}` } : {},
        });
        if (!pollResp.ok) throw new Error(`Pollinations respondió ${pollResp.status}`);
        const bytes = new Uint8Array(await pollResp.arrayBuffer());

        const path = `marketing/${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await admin.storage
          .from('comprobantes')
          .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
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
