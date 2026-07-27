import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { ModoFiltroFecha, ETIQUETAS_MODO, calcularRango, RangoFecha } from '../lib/dateRange';
import { colors, radius } from '../constants/theme';

// En Chrome/Safari móvil, arrastrar horizontalmente cerca del borde de la
// pantalla (p.ej. al deslizar entre los chips de modo) puede confundirse
// con el gesto nativo de "volver atrás" del navegador y sacar al usuario
// de la app. `overscrollBehaviorX: 'contain'` evita que el gesto se
// propague fuera de este scroll. Es una propiedad CSS web-only, por eso
// el cast: React Native no la tipa.
const SIN_OVERSCROLL_X = Platform.OS === 'web' ? ({ overscrollBehaviorX: 'contain' } as object) : null;

const MODOS: ModoFiltroFecha[] = ['dia', 'rango_dias', 'mes', 'rango_meses', 'anio', 'rango_anios'];

const PLACEHOLDER_POR_MODO: Record<ModoFiltroFecha, [string, string?]> = {
  dia: ['AAAA-MM-DD'],
  rango_dias: ['Desde AAAA-MM-DD', 'Hasta AAAA-MM-DD'],
  mes: ['AAAA-MM'],
  rango_meses: ['Desde AAAA-MM', 'Hasta AAAA-MM'],
  anio: ['AAAA'],
  rango_anios: ['Desde AAAA', 'Hasta AAAA'],
};

// Selector de rango de fechas reutilizado en las pantallas de estadísticas
// (operador y cliente): fecha específica, rango de fechas, mes, rango de
// meses, año o rango de años. Llama a `onCambio` con el rango calculado
// cada vez que hay uno válido.
export function DateRangeFilter({ onCambio }: { onCambio: (rango: RangoFecha | null) => void }) {
  const [modo, setModo] = useState<ModoFiltroFecha>('mes');
  const [valorA, setValorA] = useState('');
  const [valorB, setValorB] = useState('');

  const rango = useMemo(() => calcularRango(modo, valorA, valorB), [modo, valorA, valorB]);
  const [placeholderA, placeholderB] = PLACEHOLDER_POR_MODO[modo];

  const aplicar = () => onCambio(rango);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={SIN_OVERSCROLL_X}>
        {MODOS.map((m) => (
          <Pressable
            key={m}
            style={[styles.chip, modo === m && styles.chipActivo]}
            onPress={() => {
              setModo(m);
              setValorA('');
              setValorB('');
            }}
          >
            <Text style={[styles.chipTexto, modo === m && styles.chipTextoActivo]}>{ETIQUETAS_MODO[m]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Los inputs van en su propia fila (que puede envolver a 2 líneas
          en pantallas angostas) y el botón "Buscar" siempre abajo, a todo
          el ancho -- antes compartían una sola fila y en celulares el
          botón podía quedar apretado o directamente fuera de la vista
          cuando el modo tenía 2 campos (rango de fechas/meses/años). */}
      <View style={styles.inputsRow}>
        <TextInput style={styles.input} value={valorA} onChangeText={setValorA} placeholder={placeholderA} placeholderTextColor={colors.textMuted} />
        {placeholderB && (
          <TextInput style={styles.input} value={valorB} onChangeText={setValorB} placeholder={placeholderB} placeholderTextColor={colors.textMuted} />
        )}
      </View>
      <Pressable style={[styles.boton, !rango && styles.botonDeshabilitado]} onPress={aplicar} disabled={!rango}>
        <Text style={styles.botonTexto}>Buscar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipTexto: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  chipTextoActivo: { color: colors.text },
  inputsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    fontSize: 13,
    backgroundColor: colors.cardAlt,
  },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  botonDeshabilitado: { opacity: 0.4 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 13 },
});
