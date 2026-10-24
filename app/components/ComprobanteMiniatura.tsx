import { Image, ImageStyle, StyleProp, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';

/** ¿La URL/URI apunta a un PDF? Ignora el query string (p. ej. `?v=123` o los tokens de enlaces firmados). */
export function esPdfUri(uri: string | null | undefined): boolean {
  return !!uri && uri.split('?')[0].split('#')[0].toLowerCase().endsWith('.pdf');
}

/**
 * Miniatura de un comprobante: la imagen, o una tarjeta "PDF" cuando el
 * archivo es un PDF (un <Image> no puede dibujarlo y quedaría en blanco).
 * `esPdf` permite forzarlo cuando la URI es local (blob:/file:) y no trae
 * extensión, p. ej. al previsualizar un archivo recién elegido.
 */
export function ComprobanteMiniatura({
  uri,
  style,
  resizeMode = 'contain',
  esPdf,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover';
  esPdf?: boolean;
}) {
  if (esPdf ?? esPdfUri(uri)) {
    return (
      <View
        style={[
          { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, gap: 4 },
          style as object,
        ]}
      >
        <Text style={{ fontSize: 34 }}>📄</Text>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>PDF</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
