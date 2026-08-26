import { Usuario } from '../types/database';

export const DOCUMENTO_TIPO_ETIQUETA: Record<string, string> = {
  DNI: 'DNI',
  CE: 'C.E.',
  PASAPORTE: 'Pasaporte',
  CPP: 'CPP',
  PPT: 'PPT',
  CI: 'C.I.',
};

/** Foto/PDF del Documento de identidad: mismo límite que las imágenes de comprobante (ver lib/imagenUtil.ts). */
export const MAX_DOCUMENTO_IDENTIDAD_KB = 5000;

export const MIME_DOCUMENTO_IDENTIDAD = ['image/jpeg', 'image/png', 'application/pdf'];

const EXT_DOCUMENTO_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

/** Extensión (para el nombre del archivo en Storage) a partir del mimeType o el nombre original que entrega expo-document-picker. */
export function extensionDocumentoIdentidad(mimeType: string | null | undefined, nombreArchivo: string | null | undefined): string {
  if (mimeType && EXT_DOCUMENTO_POR_MIME[mimeType]) return EXT_DOCUMENTO_POR_MIME[mimeType];
  const ext = nombreArchivo?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || ext === 'png') return ext;
  return 'jpg';
}

export function mimeDocumentoIdentidad(ext: string): string {
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  return 'image/jpeg';
}

/**
 * El cliente puede completar su Documento de identidad recién en Perfil
 * (no en el registro inicial post-Google) -- esta es la condición que
 * bloquea "Nueva solicitud" en Inicio hasta que estén los 3 datos.
 */
export function documentoClienteCompleto(usuario: Pick<Usuario, 'documento_tipo' | 'documento_numero' | 'documento_imagen_url'> | null): boolean {
  return !!(usuario?.documento_tipo && usuario?.documento_numero && usuario?.documento_imagen_url);
}
