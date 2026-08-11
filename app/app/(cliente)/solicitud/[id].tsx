import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { descargarYCompartirComprobante } from '../../../lib/pdf';
import { formatearBs } from '../../../lib/formato';
import { Solicitud } from '../../../types/database';
import { EstadoBadge } from '../../../components/EstadoBadge';
import { ZoomableImageModal } from '../../../components/ZoomableImageModal';
import { colors, radius, cardShadow } from '../../../constants/theme';

const ETIQUETA_TIPO_TRANSFERENCIA: Record<Solicitud['tipo_transferencia'], string> = {
  transferencia_bancaria: 'Transferencia bancaria',
  pago_movil: 'Pago móvil',
};

/**
 * Seguimiento de una solicitud ya enviada: estado, checks de validación,
 * aviso visible cuando se completa, y descarga del comprobante PDF.
 */
export default function DetalleSolicitud() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [zoom, setZoom] = useState(false);

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

      {solicitud.check_deposito_ve && (
        <View style={[styles.avisoCompletado, cardShadow]}>
          <Text style={styles.avisoTitulo}>✓ ¡Operación completada!</Text>
          <Text style={styles.avisoTexto}>
            Confirmamos que {solicitud.beneficiario_nombre} recibió VES {formatearBs(solicitud.monto_ves)} en Venezuela.
          </Text>
        </View>
      )}

      <View style={styles.progresoRow}>
        <ProgresoPaso etiqueta="Pago validado en Perú" hecho={solicitud.check_deposito_peru} />
        <View style={styles.progresoLinea} />
        <ProgresoPaso etiqueta="Depósito transferido en Venezuela" hecho={solicitud.check_deposito_ve} />
      </View>

      <View style={styles.card}>
        <Row label="Beneficiario" value={solicitud.beneficiario_nombre} />
        <Row label="C.I." value={solicitud.beneficiario_ci ?? '—'} />
        <Row label="Banco" value={solicitud.beneficiario_banco} />
        <Row label="Cuenta / teléfono" value={solicitud.beneficiario_cuenta} />
        <Row label="Envías" value={`PEN ${solicitud.monto_pen.toFixed(2)}`} />
        <Row label="Recibe" value={`VES ${formatearBs(solicitud.monto_ves)}`} />
        <Row
          label="Método de pago"
          value={solicitud.metodo_pago === 'yape' ? 'Yape' : solicitud.metodo_pago === 'plin' ? 'Plin' : 'Transferencia bancaria'}
        />
        <Row label="Tipo de transferencia" value={ETIQUETA_TIPO_TRANSFERENCIA[solicitud.tipo_transferencia]} />
      </View>

      {solicitud.comprobante_pago_url && (
        <Pressable onPress={() => setZoom(true)}>
          <Image source={{ uri: solicitud.comprobante_pago_url }} style={styles.preview} />
          <Text style={styles.verCompletoTexto}>🔍 Toca para verla completa y hacer zoom</Text>
        </Pressable>
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
      <ZoomableImageModal visible={zoom} uri={solicitud.comprobante_pago_url} onClose={() => setZoom(false)} />
    </ScrollView>
  );
}

function ProgresoPaso({ etiqueta, hecho }: { etiqueta: string; hecho: boolean }) {
  return (
    <View style={styles.progresoPaso}>
      <View style={[styles.progresoCirculo, hecho && styles.progresoCirculoHecho]}>
        {hecho && <Text style={styles.progresoCheck}>✓</Text>}
      </View>
      <Text style={styles.progresoTexto}>{etiqueta}</Text>
    </View>
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
  id: { color: colors.text, fontSize: 18, fontWeight: '700' },
  avisoCompletado: { backgroundColor: `${colors.success}22`, borderColor: colors.success, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4 },
  avisoTitulo: { color: colors.success, fontSize: 18, fontWeight: '800' },
  avisoTexto: { color: colors.text, fontSize: 15, lineHeight: 18 },
  progresoRow: { flexDirection: 'row', alignItems: 'center' },
  progresoPaso: { flex: 1, alignItems: 'center', gap: 6 },
  progresoLinea: { height: 1, flex: 0.4, backgroundColor: colors.border, marginBottom: 22 },
  progresoCirculo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progresoCirculoHecho: { backgroundColor: colors.success, borderColor: colors.success },
  progresoCheck: { color: '#fff', fontWeight: '900', fontSize: 15 },
  progresoTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  rowLabel: { color: colors.textMuted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  sectionTitleDanger: { color: colors.danger, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  text: { color: colors.textMuted, fontSize: 15 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '700' },
  preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.card },
  verCompletoTexto: { color: colors.accent, fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 4 },
});
