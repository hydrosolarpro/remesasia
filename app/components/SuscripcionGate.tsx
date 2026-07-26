import { useCallback, useEffect, useState, PropsWithChildren } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { CopyField } from './CopyField';
import { RoleTag } from './RoleTag';
import { extensionDeImagen } from '../lib/imagenUtil';
import { ConfiguracionPagosAdmin, PagoSuscripcion } from '../types/database';
import { colors, radius, cardShadow } from '../constants/theme';

const periodoActual = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

type FormaPago = 'yape' | 'transferencia';

// Envuelve las pestañas del Operador Perú: hasta que el pago del mes esté
// verificado Y el admin conceda el acceso por separado, muestra esta
// pantalla de solicitud en vez del panel — sin forma de saltársela
// navegando a otra pestaña, porque reemplaza el árbol de navegación completo.
export function SuscripcionGate({ children }: PropsWithChildren) {
  const { usuario, refreshUsuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [pago, setPago] = useState<PagoSuscripcion | null>(null);
  const [config, setConfig] = useState<ConfiguracionPagosAdmin | null>(null);

  const [formaPago, setFormaPago] = useState<FormaPago>('yape');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [comprobanteExt, setComprobanteExt] = useState('jpg');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setNombre(usuario.nombre ?? '');
    setTelefono(usuario.telefono ?? '');
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegirComprobante = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!resultado.canceled) {
      setComprobanteUri(resultado.assets[0].uri);
      setComprobanteExt(extensionDeImagen(resultado.assets[0]));
    }
  };

  const enviarSolicitud = async () => {
    setError(null);
    if (!usuario) return;
    if (!nombre.trim() || !telefono.trim()) {
      setError('Completa tu nombre completo y teléfono.');
      return;
    }
    if (!comprobanteUri) {
      setError('Sube el comprobante de tu depósito.');
      return;
    }

    setEnviando(true);
    try {
      await supabase.from('usuarios').update({ nombre: nombre.trim(), telefono: telefono.trim() }).eq('id', usuario.id);

      const periodo = periodoActual();
      const path = `suscripciones/${usuario.id}/${periodo}.${comprobanteExt}`;
      const blob = await (await fetch(comprobanteUri)).blob();
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
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
      if (upsertError) throw upsertError;

      await refreshUsuario();
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando || !usuario) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (pago?.estado === 'verificado' && usuario.acceso_concedido) {
    return <>{children}</>;
  }

  // Pago verificado, pero el admin todavía no concede el acceso (segundo
  // candado independiente del pago, ver README "Suscripción mensual").
  if (pago?.estado === 'verificado' && !usuario.acceso_concedido) {
    return (
      <View style={styles.center}>
        <RoleTag rol="operador_peru" />
        <View style={[styles.card, cardShadow, styles.avisoPendiente]}>
          <Text style={styles.avisoTitulo}>Pago verificado ✓</Text>
          <Text style={styles.avisoTexto}>Ya confirmamos tu pago. En breve el administrador activará tu acceso.</Text>
        </View>
      </View>
    );
  }

  // Ya envió el comprobante — esperando revisión del admin.
  if (pago?.estado === 'pendiente') {
    return (
      <View style={styles.center}>
        <RoleTag rol="operador_peru" />
        <View style={[styles.card, cardShadow, styles.avisoPendiente]}>
          <Text style={styles.avisoTitulo}>Solicitud enviada</Text>
          <Text style={styles.avisoTexto}>En breve te responderemos.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol="operador_peru" />
      <Text style={styles.titulo}>Solicitud de acceso</Text>
      <Text style={styles.subtitulo}>
        Suscripción S/ {(config?.monto_suscripcion ?? 50).toFixed(2)} / mes — período {periodoActual()}
      </Text>

      {pago?.estado === 'rechazado' && (
        <View style={[styles.card, cardShadow, styles.avisoRechazado]}>
          <Text style={styles.avisoTexto}>Tu comprobante fue rechazado{pago.motivo_rechazo ? `: ${pago.motivo_rechazo}` : '.'} Sube uno nuevo.</Text>
        </View>
      )}

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Formas de pago</Text>
        <View style={styles.selectorRow}>
          <SelectorOpcion etiqueta="YAPE" seleccionado={formaPago === 'yape'} onPress={() => setFormaPago('yape')} />
          <SelectorOpcion etiqueta="Transferencia bancaria" seleccionado={formaPago === 'transferencia'} onPress={() => setFormaPago('transferencia')} />
        </View>

        {formaPago === 'yape' ? (
          config?.yape_qr_url ? (
            <Image source={{ uri: config.yape_qr_url }} style={styles.qrImg} resizeMode="contain" />
          ) : (
            <Text style={styles.avisoTexto}>El administrador todavía no subió el QR de Yape.</Text>
          )
        ) : (
          <View style={{ marginTop: 4 }}>
            {config?.banco && <CopyField label="Banco" value={config.banco} />}
            {config?.cuenta_soles && <CopyField label="Cuenta soles" value={config.cuenta_soles} />}
            {config?.cci && <CopyField label="CCI" value={config.cci} />}
            {config?.titular && <CopyField label="Titular" value={config.titular} />}
          </View>
        )}
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Comprobante de depósito</Text>
        <Pressable style={styles.subirBtn} onPress={elegirComprobante}>
          {comprobanteUri ? (
            <Image source={{ uri: comprobanteUri }} style={styles.comprobantePreview} resizeMode="cover" />
          ) : (
            <Text style={styles.subirBtnTexto}>Elegir captura del depósito</Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Tus datos</Text>
        <Text style={styles.label}>Nombre completo</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Teléfono</Text>
        <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Correo electrónico</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={styles.inputDisabledText}>{usuario.email}</Text>
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.enviarBtn} onPress={enviarSolicitud} disabled={enviando}>
        {enviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.enviarBtnTexto}>Enviar solicitud</Text>}
      </Pressable>
    </ScrollView>
  );
}

function SelectorOpcion({ etiqueta, seleccionado, onPress }: { etiqueta: string; seleccionado: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.opcion} onPress={onPress}>
      <View style={[styles.opcionCirculo, seleccionado && styles.opcionCirculoActivo]}>
        {seleccionado && <View style={styles.opcionPunto} />}
      </View>
      <Text style={[styles.opcionTexto, seleccionado && styles.opcionTextoActivo]}>{etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 13, marginTop: -8 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4, width: '100%' },
  seccionTitulo: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  avisoPendiente: { borderColor: colors.warning, alignItems: 'center', gap: 6 },
  avisoRechazado: { borderColor: colors.danger },
  avisoTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  avisoTexto: { color: colors.text, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  selectorRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opcionCirculo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionCirculoActivo: { borderColor: colors.success },
  opcionPunto: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success },
  opcionTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  opcionTextoActivo: { color: colors.text, fontWeight: '800' },
  qrImg: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.cardAlt, maxWidth: 220, alignSelf: 'center' },
  subirBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  subirBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  comprobantePreview: { width: '100%', height: 160, borderRadius: radius.sm },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 15,
    marginTop: 5,
    backgroundColor: colors.cardAlt,
  },
  inputDisabled: { justifyContent: 'center', opacity: 0.7 },
  inputDisabledText: { color: colors.textMuted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 13 },
  enviarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  enviarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
