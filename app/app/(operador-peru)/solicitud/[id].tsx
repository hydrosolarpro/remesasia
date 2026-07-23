import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { calcularGanancia } from '../../../lib/tasaCalculo';
import { Solicitud } from '../../../types/database';
import { EstadoBadge } from '../../../components/EstadoBadge';
import { colors } from '../../../constants/theme';

/**
 * F5 — Verificación de fondos (aprobar/rechazar comprobante).
 * F6 — Registrar tasa real de compra y marcar "USDT enviado" (pasa a EN_PROCESO).
 */
export default function SolicitudDetalleOperadorPeru() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useAuth();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [tasaReal, setTasaReal] = useState('');
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('solicitudes').select('*').eq('id', id).single();
    setSolicitud(data as Solicitud | null);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aprobar = async () => {
    setLoading(true);
    await supabase
      .from('solicitudes')
      .update({ estado: 'FONDOS_VERIFICADOS', operador_peru_id: usuario?.id })
      .eq('id', id);
    setLoading(false);
    cargar();
  };

  const rechazar = async () => {
    if (!motivoRechazo) return;
    setLoading(true);
    await supabase
      .from('solicitudes')
      .update({ estado: 'RECHAZADA', motivo_rechazo: motivoRechazo, operador_peru_id: usuario?.id })
      .eq('id', id);
    setLoading(false);
    cargar();
  };

  const marcarUsdtEnviado = async () => {
    if (!tasaReal) return;
    setLoading(true);
    await supabase
      .from('solicitudes')
      .update({ estado: 'EN_PROCESO', tasa_real_compra: Number(tasaReal) })
      .eq('id', id);
    setLoading(false);
    cargar();
  };

  if (!solicitud) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const ganancia =
    solicitud.tasa_real_compra != null
      ? calcularGanancia(solicitud.tasa_pen_usdt, solicitud.tasa_real_compra, solicitud.monto_usdt)
      : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.id}>#{solicitud.id.slice(0, 8)}</Text>
        <EstadoBadge estado={solicitud.estado} />
      </View>

      <View style={styles.card}>
        <Row label="Beneficiario" value={solicitud.beneficiario_nombre} />
        <Row label="Banco / cuenta" value={`${solicitud.beneficiario_banco} · ${solicitud.beneficiario_cuenta}`} />
        <Row label="Monto" value={`S/ ${solicitud.monto_pen.toFixed(2)} → ${solicitud.monto_usdt.toFixed(2)} USDT → Bs ${solicitud.monto_ves.toFixed(2)}`} />
        <Row label="Tasa cobrada al cliente" value={`S/ ${solicitud.tasa_pen_usdt}`} />
        {ganancia != null && <Row label="Ganancia (spread)" value={`S/ ${ganancia.toFixed(2)}`} />}
      </View>

      {solicitud.comprobante_pago_url && (
        <Image source={{ uri: solicitud.comprobante_pago_url }} style={styles.preview} />
      )}

      {solicitud.estado === 'EN_VERIFICACION' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Verificar comprobante</Text>
          <Pressable style={styles.buttonSuccess} onPress={aprobar} disabled={loading}>
            <Text style={styles.buttonText}>Aprobar — fondos verificados</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Motivo de rechazo"
            placeholderTextColor={colors.textMuted}
            value={motivoRechazo}
            onChangeText={setMotivoRechazo}
          />
          <Pressable style={styles.buttonDanger} onPress={rechazar} disabled={loading || !motivoRechazo}>
            <Text style={styles.buttonText}>Rechazar</Text>
          </Pressable>
        </View>
      )}

      {solicitud.estado === 'FONDOS_VERIFICADOS' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Registrar operación en Binance / El Dorado</Text>
          <TextInput
            style={styles.input}
            placeholder="Tasa real de compra (S/ por USDT)"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={tasaReal}
            onChangeText={setTasaReal}
          />
          <Pressable style={styles.button} onPress={marcarUsdtEnviado} disabled={loading || !tasaReal}>
            <Text style={styles.buttonText}>Marcar USDT enviado</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={styles.buttonOutline}
        onPress={() => router.push({ pathname: '/(operador-peru)/chat/[solicitudId]', params: { solicitudId: solicitud.id } })}
      >
        <Text style={styles.buttonOutlineText}>Chat con Operador Venezuela</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 14 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { color: colors.text, fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text },
  preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.card },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonSuccess: { backgroundColor: colors.success, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonDanger: { backgroundColor: colors.danger, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonOutlineText: { color: colors.textMuted, fontWeight: '600' },
  buttonText: { color: colors.text, fontWeight: '700' },
});
