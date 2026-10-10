import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { supabaseCaller } from '../_shared/supabaseCaller.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

const MAX_BYTES = 5000 * 1024;
const EXT_A_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

/**
 * Sube la foto/PDF del Documento de identidad del cliente al bucket
 * `documentos-identidad`, vía service_role (bypassa RLS de Storage).
 *
 * Se agregó porque el INSERT directo desde el cliente contra
 * storage.objects (con las policies de 0084_documento_identidad_cliente.sql)
 * fallaba con "new row violates row-level security policy" en producción
 * pese a que las policies son correctas y equivalentes a las que ya usa
 * el bucket `comprobantes` -- no se pudo aislar la causa exacta a tiempo,
 * así que se optó por el mismo patrón ya probado en generar-comprobante.ts
 * (subida server-side) en vez de seguir depurando RLS de Storage.
 */
Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  try {
    const { archivo_base64, ext } = await req.json();
    if (!archivo_base64 || !ext) {
      return new Response(JSON.stringify({ error: 'Falta archivo_base64 o ext' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const contentType = EXT_A_CONTENT_TYPE[ext];
    if (!contentType) {
      return new Response(JSON.stringify({ error: 'Formato no permitido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const caller = supabaseCaller(req);
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: rolCaller } = await caller.rpc('rol_actual');
    if (rolCaller !== 'cliente') {
      return new Response(JSON.stringify({ error: 'Solo un cliente puede subir su propio Documento de identidad' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let bytes: Uint8Array;
    try {
      const binario = atob(archivo_base64);
      bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    } catch {
      return new Response(JSON.stringify({ error: 'Archivo inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'El archivo está vacío o supera el límite permitido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const admin = supabaseAdmin();
    const path = `${user.id}/documento-identidad.${ext}`;
    const { error: uploadError } = await admin.storage
      .from('documentos-identidad')
      .upload(path, bytes, { upsert: true, contentType });
    if (uploadError) {
      console.error('subir-documento-identidad: error subiendo', uploadError);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: publicUrl } = admin.storage.from('documentos-identidad').getPublicUrl(path);
    return new Response(JSON.stringify({ url: publicUrl.publicUrl }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    console.error('subir-documento-identidad: error inesperado', err);
    return new Response(JSON.stringify({ error: 'Error inesperado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
