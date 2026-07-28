import { View, Text, StyleSheet } from 'react-native';
import { DIAS_DEMO, PRECIO_STARTER_MENSUAL, LIMITE_CLIENTES, LIMITE_EQUIPO_PERU, LIMITE_EQUIPO_VENEZUELA } from '../lib/plan';
import { colors, radius, cardShadow } from '../constants/theme';

// Presentación comercial de los planes (distinta de la tarjeta "Tu plan",
// que muestra el estado puntual del operador): explica qué incluye cada
// plan y por qué conviene pasar a STARTER, para que el propio Operador
// Perú entienda el valor sin tener que preguntar.
export function PlanesInfo() {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>Haz crecer tu negocio de remesas</Text>
      <Text style={styles.intro}>
        Empieza gratis y sube de plan cuando tu negocio lo pida — sin perder nada de lo que ya construiste: tus clientes, tu
        equipo y tu historial siguen intactos.
      </Text>

      <View style={styles.planBloque}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.planEmoji}>🎁</Text>
          <Text style={styles.planNombre}>DEMO — {DIAS_DEMO} días gratis</Text>
        </View>
        <Beneficio texto="Acceso completo desde el primer minuto: valida pagos, publica tu tasa del día y atiende clientes." />
        <Beneficio texto="Arma tu equipo en Venezuela y en Perú para probar el flujo real de principio a fin." />
        <Beneficio texto="Sin tarjeta ni pagos por adelantado — se activa solo con tu registro." />
      </View>

      <View style={[styles.planBloque, styles.planDestacado]}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.planEmoji}>🚀</Text>
          <Text style={styles.planNombre}>STARTER — S/ {PRECIO_STARTER_MENSUAL.toFixed(2)} / mes</Text>
        </View>
        <Text style={styles.planSubtitulo}>Para el negocio que ya no quiere fecha de vencimiento.</Text>
        <Beneficio texto={`Hasta ${LIMITE_CLIENTES} clientes activos enviando remesas con vos.`} destacado />
        <Beneficio texto={`${LIMITE_EQUIPO_VENEZUELA} operadores en Venezuela, para repartir la carga y responder más rápido.`} destacado />
        <Beneficio texto={`${LIMITE_EQUIPO_PERU} miembro adicional de equipo en Perú, además de vos.`} destacado />
        <Beneficio texto="Acceso permanente, sin cuenta regresiva: tu operación no se detiene." destacado />
        <Text style={styles.cierre}>
          Con {LIMITE_CLIENTES} clientes activos y comisión por remesa, STARTER se paga solo desde las primeras operaciones del mes.
        </Text>
      </View>
    </View>
  );
}

function Beneficio({ texto, destacado }: { texto: string; destacado?: boolean }) {
  return (
    <View style={styles.beneficioRow}>
      <Text style={[styles.beneficioCheck, destacado && styles.beneficioCheckDestacado]}>✓</Text>
      <Text style={styles.beneficioTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '900' },
  intro: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  planBloque: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  planDestacado: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planEmoji: { fontSize: 18 },
  planNombre: { color: colors.text, fontSize: 15, fontWeight: '800' },
  planSubtitulo: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  beneficioRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  beneficioCheck: { color: colors.textMuted, fontSize: 13, fontWeight: '800', marginTop: 1 },
  beneficioCheckDestacado: { color: colors.success },
  beneficioTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  cierre: { color: colors.text, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 6, fontStyle: 'italic' },
});
