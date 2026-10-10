import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Genera un archivo .xlsx a partir de filas planas (una hoja) y lo descarga
 * (web) o lo comparte con el selector del sistema (nativo).
 */
export async function generarYCompartirExcel(
  nombreArchivo: string,
  hojaNombre: string,
  filas: Record<string, string | number>[]
) {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, hojaNombre);

  if (Platform.OS === 'web') {
    const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const blob = new Blob([bytes], { type: MIME_XLSX });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreArchivo}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    return url;
  }

  const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const file = new File(Paths.cache, `${nombreArchivo}.xlsx`);
  file.create({ overwrite: true });
  file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: MIME_XLSX });
  }
  return file.uri;
}
