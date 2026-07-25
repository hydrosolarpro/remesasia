import * as ImagePicker from 'expo-image-picker';

const MIME_A_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * Extensión de archivo para subir una imagen elegida con expo-image-picker.
 * En web, `asset.uri` es un `blob:http://localhost:8081/<uuid>` sin ningún
 * punto — sacar la extensión con `.split('.').pop()` ahí devuelve la URL
 * entera (bug real que rompía las subidas: la ruta de Storage terminaba
 * siendo `carpeta/archivo.blob:http://localhost:8081/xxxxx`). Por eso se
 * prioriza el nombre de archivo o el mimeType, y la URI solo se usa como
 * último recurso y nunca si es un esquema blob:/data:.
 */
export function extensionDeImagen(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.fileName?.includes('.')) {
    const ext = asset.fileName.split('.').pop();
    if (ext && ext.length <= 5) return ext.toLowerCase();
  }

  if (asset.mimeType && MIME_A_EXT[asset.mimeType]) {
    return MIME_A_EXT[asset.mimeType];
  }

  if (!asset.uri.startsWith('blob:') && !asset.uri.startsWith('data:')) {
    const ext = asset.uri.split('.').pop();
    if (ext && ext.length <= 5 && !ext.includes('/') && !ext.includes(':')) return ext.toLowerCase();
  }

  return 'jpg';
}
