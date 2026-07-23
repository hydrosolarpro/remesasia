import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { KPICard } from '../../components/KPICard';
import { OperacionesDashboardRow, Solicitud } from '../../types/database';
import { colors } from '../../constants/theme';

const HOY = () => new Date().toISOString().slice(0, 10);
const INICIO_MES = () => new Date().toISOString().slice(0, 7) + '-01';
const INICIO_ANIO = () => new Date().toISOString().slice(0, 4) + '-01-01';

/** F10/F11 — Dashboard financiero: KPIs del día + totales mensual/anual + exportar CSV. */
export default function Dashboard() {
  const [hoy, setHoy] = useState<OperacionesDashboardRow | null>(null);
  const [mes, setMes] = useState<{ n_ops: number; vol_pen: number; ganancia_neta: number } | null>(null);
  const [anio, setAnio] = useState<{ n_ops: number; vol_pen: number; ganancia_neta: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('operaciones_dashboard')
        .select('*')
        .eq('fecha', HOY())
        .maybeSingle()
        .then(({ data }) => setHoy(data as OperacionesDashboardRow | null));

      supabase
        .from('operaciones_dashboard')
        .select('n_ops, vol_pen, ganancia_neta')
        .gte('fecha', INICIO_MES())
        .then(({ data }) => setMes(sumar(data ?? [])));

      supabase
        .from('operaciones_dashboard')
        .select('n_ops, vol_pen, ganancia_neta')
        .gte('fecha', INICIO_ANIO())
        .then(({ data }) => setAnio(sumar(data ?? [])));
    }, [])
  );

  const exportarCSV = async () => {
    const { data } = await supabase
      .from('solicitudes')
      .select('id, created_at, estado, monto_pen, monto_usdt, monto_ves, tasa_pen_usdt, tasa_real_compra')
      .gte('created_at', INICIO_MES())
      .order('created_at', { ascending: true });

    const filas = (data as Solicitud[]) ?? [];
    const encabezado = 'id,fecha,estado,monto_pen,monto_usdt,monto_ves,tasa_cliente,tasa_real\n';
    const cuerpo = filas
      .map((s) => `${s.id},${s.created_at},${s.estado},${s.monto_pen},${s.monto_usdt},${s.monto_ves},${s.tasa_pen_usdt},${s.tasa_real_compra ?? ''}`)
      .join('\n');

    const archivo = new File(Paths.cache, `remesas-${INICIO_MES()}.csv`);
    archivo.create({ overwrite: true });
    archivo.write(encabezado + cuerpo);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(archivo.uri, { mimeType: 'text/csv' });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Hoy</Text>
      <View style={styles.row}>
        <KPICard label="Operaciones" value={String(hoy?.n_ops ?? 0)} />
        <KPICard label="Volumen S/" value={(hoy?.vol_pen ?? 0).toFixed(2)} />
        <KPICard label="Ganancia neta" value={`S/ ${(hoy?.ganancia_neta ?? 0).toFixed(2)}`} />
      </View>

      <Text style={styles.sectionTitle}>Este mes</Text>
      <View style={styles.row}>
        <KPICard label="Operaciones" value={String(mes?.n_ops ?? 0)} />
        <KPICard label="Volumen S/" value={(mes?.vol_pen ?? 0).toFixed(2)} />
        <KPICard label="Ganancia neta" value={`S/ ${(mes?.ganancia_neta ?? 0).toFixed(2)}`} />
      </View>

      <Text style={styles.sectionTitle}>Este año</Text>
      <View style={styles.row}>
        <KPICard label="Operaciones" value={String(anio?.n_ops ?? 0)} />
        <KPICard label="Volumen S/" value={(anio?.vol_pen ?? 0).toFixed(2)} />
        <KPICard label="Ganancia neta" value={`S/ ${(anio?.ganancia_neta ?? 0).toFixed(2)}`} />
      </View>

      <Pressable style={styles.button} onPress={exportarCSV}>
        <Text style={styles.buttonText}>Exportar mes actual (CSV)</Text>
      </Pressable>
    </ScrollView>
  );
}

function sumar(rows: { n_ops: number; vol_pen: number; ganancia_neta: number }[]) {
  return rows.reduce(
    (acc, r) => ({
      n_ops: acc.n_ops + r.n_ops,
      vol_pen: acc.vol_pen + r.vol_pen,
      ganancia_neta: acc.ganancia_neta + r.ganancia_neta,
    }),
    { n_ops: 0, vol_pen: 0, ganancia_neta: 0 }
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 10 },
  sectionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonText: { color: colors.text, fontWeight: '700' },
});
