import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

// Derecho de acceso (Ley N.° 29733): descarga todos los datos personales del
// usuario en un archivo JSON, generado por la función `exportar_mis_datos`.
export async function descargarMisDatos(): Promise<void> {
  const { data, error } = await supabase.rpc('exportar_mis_datos');
  if (error || !data) throw new Error(error?.message ?? 'No se pudieron obtener tus datos.');

  const texto = JSON.stringify(data, null, 2);
  const nombre = `mis-datos-remesas-ia-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const urlLocal = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = urlLocal;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(urlLocal), 10000);
    return;
  }

  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  archivo.write(texto);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(archivo.uri, { mimeType: 'application/json' });
  }
}
