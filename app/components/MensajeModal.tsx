import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, cardShadow } from '../constants/theme';

// Reemplazo de Alert.alert para mensajes importantes: en la build web
// (react-native-web) Alert.alert es un no-op total (no muestra nada), así
// que cualquier confirmación que dependa de él simplemente desaparece en
// producción. Modal sí está implementado en react-native-web.
export function MensajeModal({
  visible,
  titulo,
  mensaje,
  textoBoton = 'Entendido',
  onCerrar,
}: {
  visible: boolean;
  titulo: string;
  mensaje: string;
  textoBoton?: string;
  onCerrar: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={styles.overlay}>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Text style={styles.mensaje}>{mensaje}</Text>
          <Pressable style={styles.boton} onPress={onCerrar}>
            <Text style={styles.botonTexto}>{textoBoton}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(4,8,20,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 24,
    gap: 12,
    width: '100%',
    maxWidth: 420,
  },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800' },
  mensaje: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
