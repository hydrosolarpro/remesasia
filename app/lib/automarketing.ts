import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { PublicacionMarketing } from '../types/database';

// ─────────────────────────────────────────────────────────────
// Automarketing: catálogos de variación y helpers para la pantalla
// (operador-peru)/automarketing.tsx. La generación real (imagen + texto)
// vive en la Edge Function `generar-publicacion-marketing`, que tiene su
// propia copia de estos catálogos (Deno no comparte este árbol) -- si se
// editan acá, actualízalos también allá.
// ─────────────────────────────────────────────────────────────

export type RedSocial = 'facebook' | 'instagram' | 'tiktok';

export const CONCEPTOS = [
  'familia venezolana feliz recibiendo dinero enviado desde Perú',
  'persona en Perú enviando dinero a su familia con el celular',
  'celular mostrando una transferencia de dinero de Perú a Venezuela',
  'manos entregando billetes con las banderas de Perú y Venezuela de fondo',
  'videollamada familiar entre Perú y Venezuela al recibir una remesa',
  'mapa de Sudamérica con una línea de dinero uniendo Perú y Venezuela',
  'beneficiario en Venezuela retirando el dinero de una remesa, sonriente',
  'joven migrante venezolano en Perú apoyando económicamente a su familia',
] as const;

export const ESTILOS = [
  'flat illustration',
  'fotografía realista',
  'estilo minimalista',
  '3d render moderno',
  'diseño geométrico',
  'acuarela artística',
] as const;

export const PALETAS = [
  'cálidos y vibrantes',
  'azules y blancos',
  'tonos pastel suaves',
  'rojo y dorado',
  'colores patrios Perú Venezuela',
] as const;

export const ENFOQUES = [
  'emocional y familiar',
  'tecnológico y moderno',
  'confianza y seguridad',
  'rapidez y eficiencia',
  'comunidad y apoyo',
] as const;

export const TAMANOS_RED_SOCIAL: Record<RedSocial, { ancho: number; alto: number; etiqueta: string; icono: string }> = {
  facebook: { ancho: 1080, alto: 1080, etiqueta: 'Facebook · 1080×1080', icono: '📘' },
  instagram: { ancho: 1080, alto: 1080, etiqueta: 'Instagram · 1080×1080', icono: '📸' },
  tiktok: { ancho: 1080, alto: 1920, etiqueta: 'TikTok · 1080×1920', icono: '🎵' },
};

// Enlace de WhatsApp para la publicación: SOLO wa.me + el teléfono del
// operador, sin ?text=... (a pedido del negocio, para que el enlace se vea
// limpio y abra el chat sin mensaje pre-escrito).
export function construirWaLink(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/\D/g, '');
  return soloDigitos.length >= 8 ? `https://wa.me/${soloDigitos}` : null;
}

// Versión "bonita" del enlace de WhatsApp para MOSTRAR en la publicación:
// sin https:// y sin la cadena ?text=... (que es ilegible). El enlace real
// y completo (con el mensaje pre-escrito) se sigue usando al tocarlo.
export function waLinkVisible(waLink: string | null | undefined): string {
  if (!waLink) return '';
  return waLink
    .replace(/^https?:\/\//, '')
    .replace(/\?.*$/, '');
}

// URL sin el prefijo https:// para mostrarla más limpia (el enlace de
// invitación sí conserva su query ?op=... porque identifica al operador).
export function urlVisible(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '');
}

// Solo el dominio de una URL (sin https:// ni ruta ni query) -- para
// mostrarlo legible dentro de la imagen, donde un token largo no sirve.
export function dominioVisible(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/[/?].*$/, '');
}

// Número de teléfono legible ("+51 960 442 025") a partir del enlace wa.me.
export function telefonoDesdeWa(waLink: string | null | undefined): string {
  if (!waLink) return '';
  const m = waLink.match(/wa\.me\/(\d+)/);
  if (!m) return '';
  const d = m[1];
  return `+${d.slice(0, 2)} ${d.slice(2).replace(/(\d{3})(?=\d)/g, '$1 ')}`.trim();
}

// Texto listo para pegar como descripción de la publicación en Facebook /
// Instagram / TikTok. Ahí los enlaces SÍ son clicables (en la imagen no).
export function construirCaption(p: {
  texto: string;
  wa_link: string | null;
  invitacion_link: string | null;
}): string {
  const partes = [p.texto.trim()];
  if (p.wa_link) partes.push(`💬 Escríbeme por WhatsApp: ${p.wa_link}`);
  if (p.invitacion_link) partes.push(`📝 Regístrate aquí: ${p.invitacion_link}`);
  return partes.join('\n\n');
}

export interface CuerpoGenerar {
  red_social: RedSocial;
  concepto?: string;
  estilo?: string;
  paleta?: string;
  enfoque?: string;
  wa_link?: string | null;
  invitacion_link?: string | null;
  regenerar_solo?: 'imagen' | 'texto';
  imagen_url_previa?: string;
  imagen_prompt_previo?: string;
  texto_previo?: string;
}

export async function generarPublicacion(cuerpo: CuerpoGenerar): Promise<PublicacionMarketing> {
  const { data, error } = await supabase.functions.invoke('generar-publicacion-marketing', { body: cuerpo });
  if (error) {
    // La función devuelve { error: '...' } con status !=2xx; supabase-js lo
    // envuelve en un FunctionsHttpError cuyo cuerpo hay que leer aparte.
    let mensaje = error.message;
    try {
      const detalle = await (error as { context?: Response }).context?.json();
      if (detalle?.error) mensaje = detalle.error;
    } catch {
      // se queda con error.message
    }
    throw new Error(mensaje);
  }
  return data as PublicacionMarketing;
}

export async function listarPublicaciones(operadorPeruId: string): Promise<PublicacionMarketing[]> {
  const { data } = await supabase
    .from('publicaciones_marketing')
    .select('*')
    .eq('operador_peru_id', operadorPeruId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data as PublicacionMarketing[] | null) ?? [];
}

// Borra la publicación de la base de datos y, si se puede, también su
// imagen del bucket de Storage -- para no acumular filas ni archivos.
export async function eliminarPublicacion(id: string, imagenUrl?: string | null): Promise<void> {
  const { error } = await supabase.from('publicaciones_marketing').delete().eq('id', id);
  if (error) throw error;

  if (imagenUrl) {
    // .../object/public/comprobantes/marketing/<uid>/<uuid>.jpg?t=123 -> marketing/<uid>/<uuid>.jpg
    const match = imagenUrl.match(/\/comprobantes\/([^?]+)/);
    if (match) {
      await supabase.storage.from('comprobantes').remove([decodeURIComponent(match[1])]).catch(() => {});
    }
  }
}

// Descarga una imagen a partir de un data URI (lo que devuelve
// ViewShot.capture({ result: 'data-uri' })). En web dispara la descarga del
// navegador; en nativo escribe un archivo temporal y abre el diálogo de
// compartir.
export async function descargarImagenDataUri(dataUri: string, nombreArchivo: string): Promise<void> {
  if (Platform.OS === 'web') {
    const enlace = document.createElement('a');
    enlace.href = dataUri;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    return;
  }
  const base64 = dataUri.includes(',') ? dataUri.slice(dataUri.indexOf(',') + 1) : dataUri;
  const archivo = new File(Paths.cache, nombreArchivo);
  archivo.create({ overwrite: true });
  archivo.write(base64, { encoding: 'base64' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: 'image/png' });
  }
}

// Descarga la imagen IA "pelada" (sin la tarjeta compuesta) directo desde
// su URL pública de Storage -- respaldo por si la captura de ViewShot falla
// en web al incluir una imagen remota.
export async function descargarImagenDesdeUrl(url: string, nombreArchivo: string): Promise<void> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  if (Platform.OS === 'web') {
    const objectUrl = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = objectUrl;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(objectUrl);
    return;
  }
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const archivo = new File(Paths.cache, nombreArchivo);
  archivo.create({ overwrite: true });
  archivo.write(buffer);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: 'image/jpeg' });
  }
}
