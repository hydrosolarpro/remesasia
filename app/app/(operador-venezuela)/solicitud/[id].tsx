import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Solicitud } from '../../../types/database';
import { EstadoBadge } from '../../../components/EstadoBadge';
import { colors } from '../../../constants/theme';

/**
 * F7 — Panel Operador Venezuela: datos del beneficiario, adjuntar comprobante VZ (opcional)
 * y marcar COMPLETADA. El trigger de BD dispara la generación del comprobante PDF (F9)
 * y las notificaciones push (F8) al cambiar el estado.
 */
export default function SolicitudDetalleOperadorVenezuela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario } = useAuth();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('solicitudes').select('*').eq('id', id).single();
    setSolicitud(data as Solicitud | null);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const adjuntarComprobanteVZ = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (resultado.canceled || !solicitud) return;

    setLoading(true);
    const archivo = resultado.assets[0];
    const ext = archivo.uri.split('.').pop();
    const path = `${solicitud.id}/comprobante-vz.${ext}`;
    const blob = await (await fetch(archivo.uri)).blob();

    const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
    if (!uploadError) {
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);
      await supabase.from('solicitudes').update({ comprobante_vz_url: publicUrl.publicUrl }).eq('id', solicitud.id);
    }
    setLoading(false);
    cargar();
  };

  const marcarCompletada = async () => {
    setLoading(true);
    await supabase
      .from('solicitudes')
      .update({ estado: 'COMPLETADA', operador_venezuela_id: usuario?.id })
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.id}>#{solicitud.id.slice(0, 8)}</Text>
        <EstadoBadge estado={solicitud.estado} />
      </View>

      <View style={styles.card}>
        <Row label="Beneficiario" value={solicitud.beneficiario_nombre} />
        <Row label="Banco" value={solicitud.beneficiario_banco} />
        <Row label="Cuenta / Pago Móvil" value={solicitud.beneficiario_cuenta} />
        <Row label="Transferir" value={`Bs ${solicitud.monto_ves.toFixed(2)}`} />
      </View>

      {solicitud.comprobante_vz_url && (
        <Image source={{ uri: solicitud.comprobante_vz_url }} style={styles.preview} />
      )}

      {solicitud.estado === 'EN_PROCESO' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Después de transferir en tu banco</Text>
          <Pressable style={styles.buttonOutline} onPress={adjuntarComprobanteVZ} disabled={loading}>
            <Text style={styles.buttonOutlineText}>Adjuntar comprobante (opcional)</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={marcarCompletada} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Marcar completada</Text>}
          </Pressable>
        </View>
      )}

      <Pressable
        style={styles.buttonOutline}
        onPress={() => router.push({ pathname: '/(operador-venezuela)/chat/[solicitudId]', params: { solicitudId: solicitud.id } })}
      >
        <Text style={styles.buttonOutlineText}>Chat con Operador Perú</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  preview: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.card },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.text, fontWeight: '700' },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonOutlineText: { color: colors.textMuted, fontWeight: '600' },
});
