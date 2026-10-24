import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const BUCKET = 'documentos-identidad';
const VIGENCIA_SEGUNDOS = 3600;

// `usuarios.documento_imagen_url` guarda la URL "pública" que devuelve
// getPublicUrl (…/object/public/documentos-identidad/<uid>/<archivo>). Con el
// bucket privado esa URL ya no abre la imagen: hay que pedir un enlace
// firmado y temporal. Esta función extrae la ruta del bucket desde la URL
// guardada (o devuelve null si no es una URL de este bucket, p. ej. un
// archivo local recién elegido).
export function rutaDocumentoIdentidad(url: string | null | undefined): string | null {
  if (!url) return null;
  const marca = `/${BUCKET}/`;
  const i = url.indexOf(marca);
  if (i === -1) return null;
  const ruta = url.slice(i + marca.length).split('?')[0];
  return ruta ? decodeURIComponent(ruta) : null;
}

// Devuelve un enlace firmado y temporal del documento. Si no corresponde
// (URL ajena al bucket) o falla la firma, devuelve la URL original, para que
// la app siga funcionando mientras el bucket todavía sea público.
export async function urlDocumentoFirmada(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const ruta = rutaDocumentoIdentidad(url);
  if (!ruta) return url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, VIGENCIA_SEGUNDOS);
  if (error || !data?.signedUrl) return url;
  return data.signedUrl;
}

export function useUrlDocumentoIdentidad(url: string | null | undefined): string | null {
  const [resuelta, setResuelta] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!url) {
      setResuelta(null);
      return;
    }
    urlDocumentoFirmada(url).then((u) => {
      if (vivo) setResuelta(u);
    });
    return () => {
      vivo = false;
    };
  }, [url]);
  return resuelta;
}
