import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { ModoFiltroFecha, ETIQUETAS_MODO, calcularRango, RangoFecha } from '../lib/dateRange';
import { colors, radius } from '../constants/theme';

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      <View style={styles.inputsRow}>
        <TextInput style={styles.input} value={valorA} onChangeText={setValorA} placeholder={placeholderA} placeholderTextColor={colors.textMuted} />
        {placeholderB && (
          <TextInput style={styles.input} value={valorB} onChangeText={setValorB} placeholder={placeholderB} placeholderTextColor={colors.textMuted} />
        )}
        <Pressable style={[styles.boton, !rango && styles.botonDeshabilitado]} onPress={aplicar} disabled={!rango}>
          <Text style={styles.botonTexto}>Buscar</Text>
        </Pressable>
      </View>
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
  inputsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    fontSize: 13,
    backgroundColor: colors.cardAlt,
  },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11 },
  botonDeshabilitado: { opacity: 0.4 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 12 },
});
