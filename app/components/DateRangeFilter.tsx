import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { ModoFiltroFecha, ETIQUETAS_MODO, calcularRango, RangoFecha } from '../lib/dateRange';
import { CalendarioDias, CalendarioMeses, CalendarioAnios } from './CalendarioFecha';
import { colors, radius } from '../constants/theme';

// En Chrome/Safari móvil, arrastrar horizontalmente cerca del borde de la
// pantalla (p.ej. al deslizar entre los chips de modo) puede confundirse
// con el gesto nativo de "volver atrás" del navegador y sacar al usuario
// de la app. `overscrollBehaviorX: 'contain'` evita que el gesto se
// propague fuera de este scroll. Es una propiedad CSS web-only, por eso
// el cast: React Native no la tipa.
const SIN_OVERSCROLL_X = Platform.OS === 'web' ? ({ overscrollBehaviorX: 'contain' } as object) : null;

const MODOS: ModoFiltroFecha[] = ['dia', 'rango_dias', 'mes', 'rango_meses', 'anio', 'rango_anios'];

// Granularidad del calendario que corresponde a cada modo, y si el modo
// tiene uno o dos campos (rango).
const GRANULARIDAD_POR_MODO: Record<ModoFiltroFecha, 'dia' | 'mes' | 'anio'> = {
  dia: 'dia',
  rango_dias: 'dia',
  mes: 'mes',
  rango_meses: 'mes',
  anio: 'anio',
  rango_anios: 'anio',
};
const ES_RANGO: Record<ModoFiltroFecha, boolean> = {
  dia: false,
  rango_dias: true,
  mes: false,
  rango_meses: true,
  anio: false,
  rango_anios: true,
};

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatearValor(granularidad: 'dia' | 'mes' | 'anio', valor: string): string {
  if (!valor) return '';
  if (granularidad === 'anio') return valor;
  if (granularidad === 'mes') {
    const [a, m] = valor.split('-');
    return `${MESES_LARGOS[Number(m) - 1]} ${a}`;
  }
  const [a, m, d] = valor.split('-');
  return `${Number(d)} ${MESES_LARGOS[Number(m) - 1].slice(0, 3)}. ${a}`;
}

// Selector de rango de fechas reutilizado en las pantallas de estadísticas
// (operador y cliente): fecha específica, rango de fechas, mes, rango de
// meses, año o rango de años. Cada campo abre un calendario (de días,
// meses o años según el modo) en vez de tener que escribir la fecha a
// mano. Llama a `onCambio` con el rango calculado cada vez que hay uno
// válido.
export function DateRangeFilter({ onCambio }: { onCambio: (rango: RangoFecha | null) => void }) {
  const [modo, setModo] = useState<ModoFiltroFecha>('mes');
  const [valorA, setValorA] = useState('');
  const [valorB, setValorB] = useState('');
  const [campoAbierto, setCampoAbierto] = useState<'A' | 'B' | null>(null);

  const rango = useMemo(() => calcularRango(modo, valorA, valorB), [modo, valorA, valorB]);
  const granularidad = GRANULARIDAD_POR_MODO[modo];
  const esRango = ES_RANGO[modo];

  const aplicar = () => onCambio(rango);

  const alternarCampo = (campo: 'A' | 'B') => setCampoAbierto((actual) => (actual === campo ? null : campo));

  const seleccionar = (valor: string) => {
    if (campoAbierto === 'A') setValorA(valor);
    else if (campoAbierto === 'B') setValorB(valor);
    setCampoAbierto(null);
  };

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
              setCampoAbierto(null);
            }}
          >
            <Text style={[styles.chipTexto, modo === m && styles.chipTextoActivo]}>{ETIQUETAS_MODO[m]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Los campos van en su propia fila (que puede envolver a 2 líneas
          en pantallas angostas) y el botón "Buscar" siempre abajo, a todo
          el ancho -- en celulares el botón podía quedar apretado o fuera
          de la vista cuando el modo tenía 2 campos. */}
      <View style={styles.camposRow}>
        <Pressable style={[styles.campo, campoAbierto === 'A' && styles.campoActivo]} onPress={() => alternarCampo('A')}>
          <Text style={valorA ? styles.campoTexto : styles.campoPlaceholder}>
            {valorA ? formatearValor(granularidad, valorA) : esRango ? 'Desde...' : 'Selecciona...'}
          </Text>
          <Text style={styles.campoIcono}>📅</Text>
        </Pressable>
        {esRango && (
          <Pressable style={[styles.campo, campoAbierto === 'B' && styles.campoActivo]} onPress={() => alternarCampo('B')}>
            <Text style={valorB ? styles.campoTexto : styles.campoPlaceholder}>
              {valorB ? formatearValor(granularidad, valorB) : 'Hasta...'}
            </Text>
            <Text style={styles.campoIcono}>📅</Text>
          </Pressable>
        )}
      </View>

      {campoAbierto && (
        <View style={styles.panel}>
          {granularidad === 'dia' && <CalendarioDias valor={campoAbierto === 'A' ? valorA : valorB} onSeleccionar={seleccionar} />}
          {granularidad === 'mes' && <CalendarioMeses valor={campoAbierto === 'A' ? valorA : valorB} onSeleccionar={seleccionar} />}
          {granularidad === 'anio' && <CalendarioAnios valor={campoAbierto === 'A' ? valorA : valorB} onSeleccionar={seleccionar} />}
        </View>
      )}

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
  camposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  campo: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    backgroundColor: colors.cardAlt,
  },
  campoActivo: { borderColor: colors.primary },
  campoTexto: { color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  campoPlaceholder: { color: colors.textMuted, fontSize: 13 },
  campoIcono: { fontSize: 13, marginLeft: 6 },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 12,
  },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  botonDeshabilitado: { opacity: 0.4 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 13 },
});
