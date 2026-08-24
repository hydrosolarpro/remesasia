import { View, Text, StyleSheet } from 'react-native';
import { GUIA_FLUJO_COMPLETO } from '../lib/guiaContenido';
import { colors, radius } from '../constants/theme';

const ETIQUETA_ACTOR: Record<'cliente' | 'operadores', string> = {
  cliente: 'CLIENTE',
  operadores: 'OPERADORES PERÚ · VENEZUELA',
};

// Esquema visual permanente del flujo de 4 pasos (ver
// funcionaldiades - flujo remesas peru-venezuela.pdf, última página):
// una línea de tiempo numerada, con una etiqueta de color indicando quién
// ejecuta cada paso (el cliente, o los operadores Perú/Venezuela). Vive
// como información permanente en el Panel del Operador principal -- es el
// único rol que necesita ver el flujo completo del negocio, no solo su
// propia parte.
export function FlujoProcesoDiagrama() {
  // El primer elemento de GUIA_FLUJO_COMPLETO es la frase introductoria
  // (sin número ni actor); los 4 siguientes son los pasos del esquema.
  const [intro, ...pasos] = GUIA_FLUJO_COMPLETO;

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>{intro.texto}</Text>
      {pasos.map((paso, i) => {
        const esUltimo = i === pasos.length - 1;
        const actor = paso.actor ?? 'operadores';
        return (
          <View key={paso.titulo} style={styles.filaPaso}>
            <View style={styles.columnaLinea}>
              <View style={[styles.circulo, actor === 'cliente' ? styles.circuloCliente : styles.circuloOperadores]}>
                <Text style={styles.circuloTexto}>{i + 1}</Text>
              </View>
              {!esUltimo && <View style={styles.lineaConectora} />}
            </View>
            <View style={styles.columnaContenido}>
              <View style={styles.headerPaso}>
                <Text style={styles.iconoPaso}>{paso.icono.replace(/^[1-4]️⃣$/, '')}</Text>
                <Text style={styles.tituloPaso}>{paso.titulo}</Text>
              </View>
              <Text style={styles.textoPaso}>{paso.texto}</Text>
              <View style={[styles.pillActor, actor === 'cliente' ? styles.pillCliente : styles.pillOperadores]}>
                <Text style={styles.pillActorTexto}>{ETIQUETA_ACTOR[actor]}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  intro: { color: colors.textMuted, fontSize: 14, lineHeight: 19, marginBottom: 10 },
  filaPaso: { flexDirection: 'row', gap: 12 },
  columnaLinea: { alignItems: 'center', width: 32 },
  circulo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  circuloCliente: { backgroundColor: colors.accent },
  circuloOperadores: { backgroundColor: colors.primary },
  circuloTexto: { color: colors.text, fontWeight: '900', fontSize: 15 },
  lineaConectora: { width: 2, flex: 1, minHeight: 24, backgroundColor: colors.border, marginTop: 2 },
  columnaContenido: { flex: 1, paddingBottom: 18, gap: 4 },
  headerPaso: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconoPaso: { fontSize: 16 },
  tituloPaso: { color: colors.text, fontSize: 16, fontWeight: '800' },
  textoPaso: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  pillActor: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  pillCliente: { backgroundColor: `${colors.accent}33` },
  pillOperadores: { backgroundColor: `${colors.primary}33` },
  pillActorTexto: { color: colors.text, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});
