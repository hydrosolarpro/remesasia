import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCorredor, TODOS_LOS_CORREDORES, CorredorId } from '../lib/corredor';
import { FlagCorredor, FlagVenezuela } from './FlagIcon';
import { colors, radius } from '../constants/theme';

// Catálogo para el LOGIN (todavía no sabemos qué corredores tiene activos el negocio).
const CORREDORES_LOGIN: { id: CorredorId; etiqueta: string }[] = [
  { id: 'PE-VE', etiqueta: 'Perú → Venezuela' },
  { id: 'CO-VE', etiqueta: 'Colombia → Venezuela' },
  { id: 'CL-VE', etiqueta: 'Chile → Venezuela' },
  { id: 'OT-VE', etiqueta: 'Otro país → Venezuela' },
];

/** Bandera del país de recepción + texto + bandera de Venezuela (las banderas son SVG: los emoji no se ven en Windows). */
export function EtiquetaCorredor({ id, etiqueta, activo }: { id: string; etiqueta: string; activo?: boolean }) {
  return (
    <View style={styles.etiqueta}>
      <FlagCorredor id={id} />
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{etiqueta}</Text>
      <FlagVenezuela width={22} height={15} />
    </View>
  );
}

/** Selector del login: guarda el corredor con el que quiere operar; al entrar se aplica si su negocio lo tiene activo. */
export function SelectorCorredorLogin() {
  const { seleccionPreferida, setSeleccion } = useCorredor();
  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Corredor de remesas</Text>
      <View style={styles.fila}>
        {CORREDORES_LOGIN.map((c) => {
          const activo = seleccionPreferida === c.id;
          return (
            <Pressable key={c.id} style={[styles.chip, activo && styles.chipActivo]} onPress={() => setSeleccion(c.id)}>
              <EtiquetaCorredor id={c.id} etiqueta={c.etiqueta} activo={activo} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Selector de corredor (país de recepción -> Venezuela). Solo aparece si el
// negocio trabaja más de uno; con solo Perú-Venezuela no se muestra nada y
// la app se ve igual que siempre. `permitirTodos` agrega la vista
// consolidada (panel y estadísticas del operador); el cliente elige un
// corredor concreto para cada solicitud.
export function SelectorCorredor({ permitirTodos = false }: { permitirTodos?: boolean }) {
  const { corredores, seleccion, setSeleccion, multiCorredor } = useCorredor();
  if (!multiCorredor) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Corredor</Text>
      <View style={styles.fila}>
        {corredores.map((c) => {
          const activo = seleccion === c.id;
          return (
            <Pressable key={c.id} style={[styles.chip, activo && styles.chipActivo]} onPress={() => setSeleccion(c.id)}>
              <EtiquetaCorredor id={c.id} etiqueta={c.etiqueta} activo={activo} />
            </Pressable>
          );
        })}
        {permitirTodos && (
          <Pressable
            style={[styles.chip, seleccion === TODOS_LOS_CORREDORES && styles.chipActivo]}
            onPress={() => setSeleccion(TODOS_LOS_CORREDORES)}
          >
            <Text style={[styles.chipTexto, seleccion === TODOS_LOS_CORREDORES && styles.chipTextoActivo]}>
              Todos los corredores
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginVertical: 8 },
  titulo: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  chipTextoActivo: { color: colors.text },
});
