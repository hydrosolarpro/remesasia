import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { PasoGuia } from '../lib/guiaContenido';
import { colors, radius, cardShadow } from '../constants/theme';

// Guía paso a paso en modal (Siguiente/Anterior), mostrada una sola vez la
// primera vez que cada rol entra a su sesión -- ver guiaContenido.ts para
// el texto de cada rol y usuarios.guia_vista_at para el control de "ya la
// vio". No resalta botones reales de la pantalla (coach marks): es un
// resumen explicado en texto simple, más simple de mantener si cambia el
// diseño de una pantalla.
export function GuiaPasoAPaso({ visible, pasos, onCerrar }: { visible: boolean; pasos: PasoGuia[]; onCerrar: () => void }) {
  const [indice, setIndice] = useState(0);
  const esUltimo = indice === pasos.length - 1;
  const paso = pasos[indice];

  const cerrarYReiniciar = () => {
    setIndice(0);
    onCerrar();
  };

  if (!paso) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrarYReiniciar}>
      <View style={styles.overlay}>
        <View style={[styles.card, cardShadow]}>
          <Pressable style={styles.saltarBtn} onPress={cerrarYReiniciar} hitSlop={8}>
            <Text style={styles.saltarTexto}>✕</Text>
          </Pressable>

          <Text style={styles.icono}>{paso.icono}</Text>
          <Text style={styles.titulo}>{paso.titulo}</Text>
          <Text style={styles.texto}>{paso.texto}</Text>

          <View style={styles.puntosRow}>
            {pasos.map((_, i) => (
              <View key={i} style={[styles.punto, i === indice && styles.puntoActivo]} />
            ))}
          </View>

          <View style={styles.botonesRow}>
            <Pressable
              style={[styles.botonSecundario, indice === 0 && styles.botonDeshabilitado]}
              onPress={() => setIndice((i) => Math.max(0, i - 1))}
              disabled={indice === 0}
            >
              <Text style={styles.botonSecundarioTexto}>Anterior</Text>
            </Pressable>
            <Pressable
              style={styles.botonPrimario}
              onPress={() => (esUltimo ? cerrarYReiniciar() : setIndice((i) => i + 1))}
            >
              <Text style={styles.botonPrimarioTexto}>{esUltimo ? 'Entendido' : 'Siguiente'}</Text>
            </Pressable>
          </View>

          <Text style={styles.contador}>
            {indice + 1} de {pasos.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(4,8,20,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 24,
    paddingTop: 36,
    gap: 10,
    width: '100%',
    maxWidth: 440,
  },
  saltarBtn: { position: 'absolute', top: 12, right: 12, padding: 6 },
  saltarTexto: { color: colors.textMuted, fontSize: 16, fontWeight: '800' },
  icono: { fontSize: 40 },
  titulo: { color: colors.text, fontSize: 21, fontWeight: '800' },
  texto: { color: colors.textMuted, fontSize: 16, lineHeight: 22 },
  puntosRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  puntoActivo: { backgroundColor: colors.primary, width: 18 },
  botonesRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  botonSecundario: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  botonDeshabilitado: { opacity: 0.35 },
  botonSecundarioTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
  botonPrimario: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  botonPrimarioTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
  contador: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 2 },
});
