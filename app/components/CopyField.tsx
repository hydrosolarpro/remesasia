import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../constants/theme';

// Fila "label: valor" con botón de copiar — usada para que el cliente copie
// los datos de cuenta/QR del operador Perú sin transcribir a mano.
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    await Clipboard.setStringAsync(value);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <View style={styles.row}>
      <View style={styles.textos}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Pressable style={styles.boton} onPress={copiar}>
        <Text style={styles.botonTexto}>{copiado ? '✓ Copiado' : 'Copiar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  textos: { flex: 1 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  value: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 1 },
  boton: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  botonTexto: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
