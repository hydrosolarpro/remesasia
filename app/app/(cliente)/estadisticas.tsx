import { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { SolicitudCard } from '../../components/SolicitudCard';
import { generarYCompartirExcel } from '../../lib/excelReporte';
import { RangoFecha } from '../../lib/dateRange';
import { Solicitud } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

const ETIQUETA_METODO_PAGO: Record<Solicitud['metodo_pago'], string> = { yape: 'Yape', plin: 'Plin', banco: 'Transferencia bancaria' };

interface Punto {
  etiqueta: string;
  monto: number;
}

// Estadística de depósitos realizados por el cliente, filtrable por fecha
// específica, rango de fechas, mes, rango de meses, año o rango de años.
export default function EstadisticasCliente() {
  const { usuario } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [rango, setRango] = useState<RangoFecha | null>(null);
  const [depositos, setDepositos] = useState<Solicitud[]>([]);
  const [buscado, setBuscado] = useState(false);

  const buscar = async (nuevoRango: RangoFecha | null) => {
    setRango(nuevoRango);
    if (!nuevoRango || !usuario) return;
    // Antes de recargar, sube al inicio: si había resultados de una
    // búsqueda anterior visibles más abajo, al desaparecer mientras carga
    // la página "saltaba" porque el scroll se quedaba apuntando a un
    // espacio que ya no existía.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setCargando(true);
    setBuscado(true);
    const { data } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('cliente_id', usuario.id)
      .eq('check_deposito_ve', true)
      .gte('created_at', nuevoRango.desde)
      .lt('created_at', nuevoRango.hasta)
      .order('created_at', { ascending: false });
    setDepositos((data as Solicitud[] | null) ?? []);
    setCargando(false);
  };

  const montoTotal = depositos.reduce((acc, d) => acc + d.monto_pen, 0);

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const filas = depositos.map((d) => ({
        'Fecha de envío': new Date(d.created_at).toLocaleString('es-PE'),
        Beneficiario: d.beneficiario_nombre,
        'C.I.': d.beneficiario_ci ?? '',
        'Entidad bancaria': d.beneficiario_banco,
        'N° cuenta': d.beneficiario_cuenta,
        'Monto (S/)': d.monto_pen,
        'Recibe (Bs)': d.monto_ves,
        'USD (BCV)': d.monto_usd_bcv ?? '',
        'EUR (BCV)': d.monto_eur_bcv ?? '',
        'Forma de pago': ETIQUETA_METODO_PAGO[d.metodo_pago],
        'Depósito en Venezuela': d.check_deposito_ve_at ? new Date(d.check_deposito_ve_at).toLocaleString('es-PE') : '',
      }));
      await generarYCompartirExcel('mis-solicitudes-realizadas', 'Solicitudes', filas);
    } finally {
      setExportando(false);
    }
  };

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
    <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Estadística de depósitos realizados</Text>
      <DateRangeFilter onCambio={buscar} />

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}

      {!cargando && buscado && rango && (
        <View style={[styles.resumen, cardShadow]}>
          <View style={styles.resumenHeaderRow}>
            <Text style={styles.resumenPeriodo}>{rango.etiqueta}</Text>
            <Pressable style={styles.excelBtn} onPress={exportarExcel} disabled={exportando || depositos.length === 0}>
              {exportando ? <ActivityIndicator color="#fff" /> : <Text style={styles.excelBtnTexto}>Excel</Text>}
            </Pressable>
          </View>
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
  resumenHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumenPeriodo: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  excelBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-around' },
  resumenItem: { alignItems: 'center' },
  resumenLabel: { color: colors.textMuted, fontSize: 11 },
  resumenValor: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  chartTitulo: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
});
