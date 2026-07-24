import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { descargarYCompartirComprobante } from '../../../lib/pdf';
import { Solicitud } from '../../../types/database';
import { EstadoBadge } from '../../../components/EstadoBadge';
import { colors } from '../../../constants/theme';

/**
 * Seguimiento de una solicitud ya enviada: estado, checks de validación
 * y descarga del comprobante PDF cuando está COMPLETADA.
 */
export default function DetalleSolicitud() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('solicitudes').select('*').eq('id', id).single();
    setSolicitud(data as Solicitud | null);
  }, [id]);

  useEffect(() => {
    cargar();
    const channel = supabase
      .channel(`solicitud-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'solicitudes', filter: `id=eq.${id}` },
        (payload) => setSolicitud(payload.new as Solicitud)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, cargar]);

  if (!solicitud) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.id}>Solicitud #{solicitud.id.slice(0, 8)}</Text>
        <EstadoBadge estado={solicitud.estado} />
      </View>

      <View style={styles.card}>
        <Row label="Beneficiario" value={solicitud.beneficiario_nombre} />
        <Row label="C.I." value={solicitud.beneficiario_ci ?? '—'} />
        <Row label="Banco" value={solicitud.beneficiario_banco} />
        <Row label="Cuenta / teléfono" value={solicitud.beneficiario_cuenta} />
        <Row label="Envías" value={`S/ ${solicitud.monto_pen.toFixed(2)}`} />
        <Row label="Recibe" value={`Bs ${solicitud.monto_ves.toFixed(2)}`} />
        <Row label="Método de pago" value={solicitud.metodo_pago === 'yape' ? 'Yape' : 'Transferencia bancaria'} />
      </View>

      <View style={styles.card}>
        <Row label="Depósito validado en Perú" value={solicitud.check_deposito_peru ? 'Sí' : 'Pendiente'} />
        <Row label="Depósito efectuado en Venezuela" value={solicitud.check_deposito_ve ? 'Sí' : 'Pendiente'} />
      </View>

      {solicitud.comprobante_pago_url && (
        <Image source={{ uri: solicitud.comprobante_pago_url }} style={styles.preview} />
      )}

      {solicitud.estado === 'RECHAZADA' && solicitud.motivo_rechazo && (
        <View style={styles.card}>
          <Text style={styles.sectionTitleDanger}>Motivo de rechazo</Text>
          <Text style={styles.text}>{solicitud.motivo_rechazo}</Text>
        </View>
      )}

      {solicitud.estado === 'COMPLETADA' && solicitud.comprobante_pdf_url && (
        <Pressable
          style={styles.button}
          onPress={() => descargarYCompartirComprobante(solicitud.comprobante_pdf_url!, solicitud.id)}
        >
          <Text style={styles.buttonText}>Descargar comprobante PDF</Text>
        </Pressable>
      )}
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  sectionTitleDanger: { color: colors.danger, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  text: { color: colors.textMuted, fontSize: 13 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '700' },
  preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.card },
});
