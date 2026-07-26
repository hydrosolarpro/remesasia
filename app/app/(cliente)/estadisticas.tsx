import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { SolicitudCard } from '../../components/SolicitudCard';
import { RangoFecha } from '../../lib/dateRange';
import { Solicitud } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

interface Punto {
  etiqueta: string;
  monto: number;
}

// Estadística de depósitos realizados por el cliente, filtrable por fecha
// específica, rango de fechas, mes, rango de meses, año o rango de años.
export default function EstadisticasCliente() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [rango, setRango] = useState<RangoFecha | null>(null);
  const [depositos, setDepositos] = useState<Solicitud[]>([]);
  const [buscado, setBuscado] = useState(false);

  const buscar = async (nuevoRango: RangoFecha | null) => {
    setRango(nuevoRango);
    if (!nuevoRango || !usuario) return;
    setCargando(true);
    setBuscado(true);
    const { data } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('cliente_id', usuario.id)
      .gte('created_at', nuevoRango.desde)
      .lt('created_at', nuevoRango.hasta)
      .order('created_at', { ascending: false });
    setDepositos((data as Solicitud[] | null) ?? []);
    setCargando(false);
  };

  const montoTotal = depositos.reduce((acc, d) => acc + d.monto_pen, 0);

  const puntos = useMemo<Punto[]>(() => {
    if (!rango) return [];
    const diasSpan = (new Date(rango.hasta).getTime() - new Date(rango.desde).getTime()) / 86400000;
    const granularidad: 'dia' | 'mes' | 'anio' = diasSpan <= 31 ? 'dia' : diasSpan <= 730 ? 'mes' : 'anio';

    const grupos = new Map<string, number>();
    for (const d of depositos) {
      const clave =
        granularidad === 'dia' ? d.created_at.slice(0, 10) : granularidad === 'mes' ? d.created_at.slice(0, 7) : d.created_at.slice(0, 4);
      grupos.set(clave, (grupos.get(clave) ?? 0) + d.monto_pen);
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([clave, monto]) => ({ etiqueta: granularidad === 'dia' ? clave.slice(5) : clave, monto }));
  }, [depositos, rango]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Estadística de depósitos realizados</Text>
      <DateRangeFilter onCambio={buscar} />

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}

      {!cargando && buscado && rango && (
        <View style={[styles.resumen, cardShadow]}>
          <Text style={styles.resumenPeriodo}>{rango.etiqueta}</Text>
          <View style={styles.resumenFila}>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Depósitos</Text>
              <Text style={styles.resumenValor}>{depositos.length}</Text>
            </View>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Monto total</Text>
              <Text style={styles.resumenValor}>S/ {montoTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {!cargando && puntos.length > 1 && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.chartTitulo}>Monto solicitado vs. período (S/)</Text>
          <BarChart
            data={puntos.map((p) => ({ value: Math.round(p.monto), label: p.etiqueta }))}
            barWidth={22}
            spacing={16}
            roundedTop
            frontColor={colors.primary}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            noOfSections={4}
            hideRules
          />
        </View>
      )}

      {!cargando && buscado && depositos.length === 0 && <Text style={styles.vacio}>No hay depósitos en ese período.</Text>}

      {!cargando &&
        depositos.map((d) => (
          <View key={d.id} style={{ marginTop: 8 }}>
            <SolicitudCard solicitud={d} onPress={() => router.push({ pathname: '/(cliente)/solicitud/[id]', params: { id: d.id } })} />
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 14, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800' },
  resumen: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  resumenPeriodo: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-around' },
  resumenItem: { alignItems: 'center' },
  resumenLabel: { color: colors.textMuted, fontSize: 11 },
  resumenValor: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  chartTitulo: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
});
