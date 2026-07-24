import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { SolicitudCard } from '../../components/SolicitudCard';
import { RangoFecha } from '../../lib/dateRange';
import { Solicitud } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

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
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
});
