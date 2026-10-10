import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

/**
 * F9 — Descarga el comprobante PDF ya generado (Edge Function `generar-comprobante`
 * lo crea al marcar la solicitud COMPLETADA y guarda la URL en comprobante_pdf_url)
 * y lo comparte/abre desde el dispositivo del cliente.
 */
export async function descargarYCompartirComprobante(comprobantePdfUrl: string, solicitudId: string) {
  const destino = new File(Paths.cache, `comprobante-${solicitudId}.pdf`);
  const archivo = await File.downloadFileAsync(comprobantePdfUrl, destino, { idempotent: true });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: 'application/pdf' });
  }
  return archivo.uri;
}

/**
 * Dispara manualmente la generación del comprobante (normalmente la dispara el
 * trigger de BD al pasar a COMPLETADA; esto sirve como reintento desde la app).
 */
export async function regenerarComprobante(solicitudId: string) {
  const { data, error } = await supabase.functions.invoke('generar-comprobante', {
    body: { solicitud_id: solicitudId },
  });
  if (error) throw error;
  return data as { comprobante_pdf_url: string };
}
