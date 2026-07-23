import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { descargarYCompartirComprobante } from '../../../lib/pdf';
import { Solicitud } from '../../../types/database';
import { EstadoBadge } from '../../../components/EstadoBadge';
import { colors } from '../../../constants/theme';

/**
 * Seguimiento de una solicitud (todos los roles la ven, cada uno con sus acciones).
 * F4 — el cliente sube el comprobante de pago aquí mientras esté PENDIENTE.
 * F9 — cuando está COMPLETADA, descarga el comprobante PDF.
 */
export default function DetalleSolicitud() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [subiendo, setSubiendo] = useState(false);

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

  const subirComprobante = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos para subir el comprobante.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (resultado.canceled || !solicitud) return;

    setSubiendo(true);
    const archivo = resultado.assets[0];
    const ext = archivo.uri.split('.').pop();
    const path = `${solicitud.id}/comprobante-cliente.${ext}`;
    const respuesta = await fetch(archivo.uri);
    const blob = await respuesta.blob();

    const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, {
      upsert: true,
    });
    if (uploadError) {
      setSubiendo(false);
      Alert.alert('Error al subir', uploadError.message);
      return;
    }
    const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

    await supabase
      .from('solicitudes')
      .update({ comprobante_pago_url: publicUrl.publicUrl, estado: 'EN_VERIFICACION' })
      .eq('id', solicitud.id);

    setSubiendo(false);
    cargar();
  };

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
        <Row label="Banco" value={solicitud.beneficiario_banco} />
        <Row label="Cuenta / teléfono" value={solicitud.beneficiario_cuenta} />
        <Row label="Envías" value={`S/ ${solicitud.monto_pen.toFixed(2)}`} />
        <Row label="Recibe" value={`Bs ${solicitud.monto_ves.toFixed(2)}`} />
        <Row label="Método de pago" value={solicitud.metodo_pago === 'yape' ? 'Yape' : 'Transferencia bancaria'} />
      </View>

      {solicitud.estado === 'PENDIENTE' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sube tu comprobante de pago</Text>
          <Pressable style={styles.button} onPress={subirComprobante} disabled={subiendo}>
            {subiendo ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>Elegir captura del comprobante</Text>
            )}
          </Pressable>
        </View>
      )}

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
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionTitleDanger: { color: colors.danger, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  text: { color: colors.textMuted, fontSize: 13 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '700' },
  preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.card },
});
