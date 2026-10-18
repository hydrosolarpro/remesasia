import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const MIME_POR_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
};

function extensionDe(uri: string): string {
  const limpia = uri.split('?')[0].split('#')[0];
  const ext = limpia.includes('.') ? limpia.split('.').pop()!.toLowerCase() : '';
  return ext && ext.length <= 5 ? ext : 'jpg';
}

/**
 * Guarda un archivo (comprobante, documento) en el equipo del usuario.
 * - Web (laptop / navegador del móvil): descarga directa a la carpeta de
 *   Descargas, sin abrir otra pestaña.
 * - App nativa: baja el archivo y abre el menú del sistema para guardarlo en
 *   Fotos / Archivos o compartirlo.
 * `nombreBase` sin extensión; la extensión se toma de la URL.
 */
export async function descargarArchivo(uri: string, nombreBase: string): Promise<void> {
  const ext = extensionDe(uri);
  const nombre = `${nombreBase}.${ext}`;

  if (Platform.OS === 'web') {
    const respuesta = await fetch(uri);
    if (!respuesta.ok) throw new Error('No se pudo descargar el archivo');
    const blob = await respuesta.blob();
    const urlLocal = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlLocal;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(urlLocal), 10000);
    return;
  }

  const destino = new File(Paths.cache, nombre);
  const archivo = await File.downloadFileAsync(uri, destino, { idempotent: true });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: MIME_POR_EXT[ext] ?? 'application/octet-stream' });
  }
}

/** Descarga varios archivos seguidos (p. ej. todas las fotos de un comprobante). */
export async function descargarArchivos(uris: string[], nombreBase: string): Promise<void> {
  for (let i = 0; i < uris.length; i++) {
    await descargarArchivo(uris[i], uris.length > 1 ? `${nombreBase}-${i + 1}` : nombreBase);
    if (Platform.OS === 'web' && i < uris.length - 1) await new Promise((r) => setTimeout(r, 400));
  }
}
