import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCorredor, banderaCorredor, TODOS_LOS_CORREDORES } from '../lib/corredor';
import { colors, radius } from '../constants/theme';

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
        {corredores.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, seleccion === c.id && styles.chipActivo]}
            onPress={() => setSeleccion(c.id)}
          >
            <Text style={[styles.chipTexto, seleccion === c.id && styles.chipTextoActivo]}>
              {banderaCorredor(c.id)} {c.etiqueta}
            </Text>
          </Pressable>
        ))}
        {permitirTodos && (
          <Pressable
            style={[styles.chip, seleccion === TODOS_LOS_CORREDORES && styles.chipActivo]}
            onPress={() => setSeleccion(TODOS_LOS_CORREDORES)}
          >
            <Text style={[styles.chipTexto, seleccion === TODOS_LOS_CORREDORES && styles.chipTextoActivo]}>
              🌐 Todos los corredores
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
  chipTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  chipTextoActivo: { color: colors.text },
});
