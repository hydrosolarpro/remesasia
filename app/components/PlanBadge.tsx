import { View, Text, StyleSheet } from 'react-native';
import { useEstadoPlanNegocio } from '../lib/useEstadoPlanNegocio';
import { diasRestantesDemo } from '../lib/plan';
import { colors, radius } from '../constants/theme';

// Insignia de plan (DEMO con días restantes, o STARTER) para el header de
// Operador Perú y Operador Venezuela, debajo de las banderas.
export function PlanBadge({ operadorPeruId }: { operadorPeruId: string | null | undefined }) {
  const { cargando, plan, demoInicio } = useEstadoPlanNegocio(operadorPeruId);
  if (cargando || !plan) return null;

  const esDemo = plan === 'demo';

  return (
    <View style={[styles.pill, esDemo ? styles.pillDemo : styles.pillStarter]}>
      <Text style={styles.texto}>{esDemo ? `DEMO · ${diasRestantesDemo(demoInicio)}d` : 'STARTER'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-end', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  pillDemo: { backgroundColor: `${colors.warning}33` },
  pillStarter: { backgroundColor: `${colors.success}33` },
  texto: { color: colors.text, fontSize: 10, fontWeight: '800' },
});
