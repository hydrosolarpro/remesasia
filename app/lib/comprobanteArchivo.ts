import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { extensionDeImagen, validarTamanoImagen, MAX_IMAGEN_KB } from './imagenUtil';

export type ComprobanteElegido = { uri: string; ext: string };

const MIME_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function extensionDeArchivo(mimeType: string | null | undefined, nombre: string | null | undefined): string {
  if (mimeType && EXT_POR_MIME[mimeType]) return EXT_POR_MIME[mimeType];
  const ext = nombre?.split('.').pop()?.toLowerCase();
  if (ext && ['pdf', 'png', 'webp', 'jpg', 'jpeg'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  return 'jpg';
}

function avisar(titulo: string, mensaje: string) {
  if (Platform.OS === 'web') window.alert(`${titulo}\n\n${mensaje}`);
  else Alert.alert(titulo, mensaje);
}

async function elegirArchivos(multiple: boolean, tipos: string[]): Promise<ComprobanteElegido[]> {
  const resultado = await DocumentPicker.getDocumentAsync({ type: tipos, multiple, copyToCacheDirectory: true });
  if (resultado.canceled || !resultado.assets?.length) return [];
  const elegidos: ComprobanteElegido[] = [];
  let algunoPesado = false;
  for (const asset of resultado.assets) {
    if (asset.size != null && asset.size > MAX_IMAGEN_KB * 1024) {
      algunoPesado = true;
      continue;
    }
    elegidos.push({ uri: asset.uri, ext: extensionDeArchivo(asset.mimeType, asset.name) });
  }
  if (algunoPesado) {
    avisar('Archivo muy pesado', `Uno o más archivos superan el límite de ${MAX_IMAGEN_KB / 1000} MB y no se agregaron.`);
  }
  return elegidos;
}

async function elegirFotos(multiple: boolean, mensajePermiso: string): Promise<ComprobanteElegido[]> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    avisar('Permiso necesario', mensajePermiso);
    return [];
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: multiple });
  if (resultado.canceled) return [];
  const elegidos: ComprobanteElegido[] = [];
  let algunaPesada = false;
  for (const asset of resultado.assets) {
    if (!(await validarTamanoImagen(asset))) {
      algunaPesada = true;
      continue;
    }
    elegidos.push({ uri: asset.uri, ext: extensionDeImagen(asset) });
  }
  if (algunaPesada) {
    avisar('Imagen muy pesada', `Una o más imágenes superan el límite de ${MAX_IMAGEN_KB} KB y no se agregaron.`);
  }
  return elegidos;
}

/**
 * Selector único de comprobantes: acepta fotos Y archivos PDF.
 * - Web: un solo diálogo de archivos que lista imágenes y PDF.
 * - App nativa: pregunta primero "Foto de la galería" o "Archivo PDF" (la
 *   galería comprime la foto; el PDF se sube tal cual, con tope de 5 MB).
 */
export async function elegirComprobantes(opciones: { multiple: boolean; mensajePermiso: string }): Promise<ComprobanteElegido[]> {
  if (Platform.OS === 'web') return elegirArchivos(opciones.multiple, MIME_COMPROBANTE);

  const origen = await new Promise<'foto' | 'pdf' | null>((resolve) => {
    Alert.alert(
      'Subir comprobante',
      '¿Qué quieres adjuntar?',
      [
        { text: 'Foto de la galería', onPress: () => resolve('foto') },
        { text: 'Archivo PDF', onPress: () => resolve('pdf') },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
  if (origen === 'foto') return elegirFotos(opciones.multiple, opciones.mensajePermiso);
  if (origen === 'pdf') return elegirArchivos(opciones.multiple, ['application/pdf']);
  return [];
}
