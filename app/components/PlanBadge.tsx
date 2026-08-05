import { View, Text, StyleSheet } from 'react-native';
import { useEstadoPlanNegocio } from '../lib/useEstadoPlanNegocio';
import { diasRestantesDemo, diasRestantesPlanPagado, debeAvisarRenovacion, NOMBRE_PLAN } from '../lib/plan';
import { colors, radius } from '../constants/theme';

// Insignia de plan (nombre + días restantes del ciclo de 30 días vigente)
// para el header de Operador Perú y Operador Venezuela, debajo de las
// banderas -- se pone en rojo/aviso los últimos DIAS_AVISO_RENOVACION días.
export function PlanBadge({ operadorPeruId }: { operadorPeruId: string | null | undefined }) {
  const { cargando, plan, demoInicio, planInicio } = useEstadoPlanNegocio(operadorPeruId);
  if (cargando || !plan) return null;

  const esDemo = plan === 'demo';
  const dias = esDemo ? diasRestantesDemo(demoInicio) : diasRestantesPlanPagado(planInicio);
  const porVencer = !esDemo && debeAvisarRenovacion(planInicio);
  const nombre = NOMBRE_PLAN[plan] ?? plan.toUpperCase();

  return (
    <View style={[styles.pill, esDemo ? styles.pillDemo : porVencer ? styles.pillPorVencer : styles.pillStarter]}>
      <Text style={styles.texto}>{planInicio || esDemo ? `${nombre} · ${dias}d` : nombre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-end', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  pillDemo: { backgroundColor: `${colors.warning}33` },
  pillStarter: { backgroundColor: `${colors.success}33` },
  pillPorVencer: { backgroundColor: `${colors.danger}44` },
  texto: { color: colors.text, fontSize: 12, fontWeight: '800' },
});
