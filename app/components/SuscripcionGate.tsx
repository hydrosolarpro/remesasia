import { useCallback, useEffect, useState, PropsWithChildren } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { CopyField } from './CopyField';
import { RoleTag } from './RoleTag';
import { ConfiguracionPagosAdmin, PagoSuscripcion } from '../types/database';
import { colors, radius, cardShadow } from '../constants/theme';

const periodoActual = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

// Envuelve las pestañas del Operador Perú: si no hay un pago verificado
// para el mes en curso, muestra la pantalla de suscripción en vez del
// panel — sin forma de saltársela navegando a otra pestaña, porque
// reemplaza el árbol de navegación completo.
export function SuscripcionGate({ children }: PropsWithChildren) {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [pago, setPago] = useState<PagoSuscripcion | null>(null);
  const [config, setConfig] = useState<ConfiguracionPagosAdmin | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    const [{ data: pagoData }, { data: configData }] = await Promise.all([
      supabase
        .from('pagos_suscripcion')
        .select('*')
        .eq('operador_peru_id', usuario.id)
        .eq('periodo', periodoActual())
        .maybeSingle(),
      supabase.from('configuracion_pagos_admin').select('*').maybeSingle(),
    ]);
    setPago(pagoData as PagoSuscripcion | null);
    setConfig(configData as ConfiguracionPagosAdmin | null);
    setCargando(false);
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subirComprobante = async () => {
    if (!usuario) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (resultado.canceled) return;

    setSubiendo(true);
    const archivo = resultado.assets[0];
    const ext = archivo.uri.split('.').pop() ?? 'jpg';
    const periodo = periodoActual();
    const path = `suscripciones/${usuario.id}/${periodo}.${ext}`;
    const blob = await (await fetch(archivo.uri)).blob();

    const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
    if (uploadError) {
      setSubiendo(false);
      Alert.alert('Error al subir', uploadError.message);
      return;
    }
    const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

    const { error: upsertError } = await supabase.from('pagos_suscripcion').upsert(
      {
        operador_peru_id: usuario.id,
        periodo,
        monto: config?.monto_suscripcion ?? 50,
        comprobante_url: publicUrl.publicUrl,
        estado: 'pendiente',
      },
      { onConflict: 'operador_peru_id,periodo' }
    );
    setSubiendo(false);
    if (upsertError) {
      Alert.alert('Error al registrar el pago', upsertError.message);
      return;
    }
    cargar();
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (pago?.estado === 'verificado') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <RoleTag rol="operador_peru" />
      <Text style={styles.titulo}>Suscripción mensual</Text>
      <Text style={styles.subtitulo}>
        S/ {(config?.monto_suscripcion ?? 50).toFixed(2)} / mes — período {periodoActual()}
      </Text>

      {pago?.estado === 'pendiente' && (
        <View style={[styles.card, cardShadow, styles.avisoPendiente]}>
          <Text style={styles.avisoTexto}>Tu comprobante está en revisión. Te avisamos apenas el administrador lo verifique.</Text>
        </View>
      )}
      {pago?.estado === 'rechazado' && (
        <View style={[styles.card, cardShadow, styles.avisoRechazado]}>
          <Text style={styles.avisoTexto}>Tu comprobante fue rechazado{pago.motivo_rechazo ? `: ${pago.motivo_rechazo}` : '.'} Sube uno nuevo.</Text>
        </View>
      )}

      {(!pago || pago.estado === 'rechazado') && (
        <>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.seccionTitulo}>Datos de pago</Text>
            {config?.banco && <CopyField label="Banco" value={config.banco} />}
            {config?.cuenta_soles && <CopyField label="Cuenta soles" value={config.cuenta_soles} />}
            {config?.cci && <CopyField label="CCI" value={config.cci} />}
            {config?.titular && <CopyField label="Titular" value={config.titular} />}
          </View>

          {(config?.yape_qr_url || config?.plin_qr_url) && (
            <View style={[styles.card, cardShadow, styles.qrRow]}>
              {config.yape_qr_url && (
                <View style={styles.qrCol}>
                  <Text style={styles.qrLabel}>Yape</Text>
                  <Image source={{ uri: config.yape_qr_url }} style={styles.qrImg} resizeMode="contain" />
                </View>
              )}
              {config.plin_qr_url && (
                <View style={styles.qrCol}>
                  <Text style={styles.qrLabel}>Plin</Text>
                  <Image source={{ uri: config.plin_qr_url }} style={styles.qrImg} resizeMode="contain" />
                </View>
              )}
            </View>
          )}

          <Pressable style={styles.subirBtn} onPress={subirComprobante} disabled={subiendo}>
            {subiendo ? <ActivityIndicator color={colors.text} /> : <Text style={styles.subirBtnTexto}>Subir comprobante de pago</Text>}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 12 },
  titulo: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 13, marginTop: -8 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4 },
  seccionTitulo: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  avisoPendiente: { borderColor: colors.warning },
  avisoRechazado: { borderColor: colors.danger },
  avisoTexto: { color: colors.text, fontSize: 13, lineHeight: 19 },
  qrRow: { flexDirection: 'row', gap: 16 },
  qrCol: { flex: 1, alignItems: 'center' },
  qrLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  qrImg: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  subirBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  subirBtnTexto: { color: colors.text, fontWeight: '700' },
});
