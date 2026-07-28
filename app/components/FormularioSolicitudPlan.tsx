import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { CopyField } from './CopyField';
import { extensionDeImagen } from '../lib/imagenUtil';
import { ConfiguracionPagosAdmin } from '../types/database';
import { PRECIO_STARTER_MENSUAL } from '../lib/plan';
import { colors, radius, cardShadow } from '../constants/theme';

const periodoActual = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

type FormaPago = 'yape' | 'transferencia';

// Formulario de solicitud de pago de la suscripción (upsert en
// pagos_suscripcion, a la espera de aprobación del admin). Se usa tanto
// dentro de SuscripcionGate (cuando el DEMO ya venció) como desde el botón
// proactivo "Solicitar plan STARTER" en Perfil (operador todavía en DEMO
// vigente, adelantando el upgrade antes de que se le cierre el acceso).
export function FormularioSolicitudPlan({ onEnviado }: { onEnviado?: () => void }) {
  const { usuario, refreshUsuario } = useAuth();
  const [config, setConfig] = useState<ConfiguracionPagosAdmin | null>(null);
  const [formaPago, setFormaPago] = useState<FormaPago>('yape');
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [comprobanteExt, setComprobanteExt] = useState('jpg');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('configuracion_pagos_admin')
      .select('*')
      .maybeSingle()
      .then(({ data }) => setConfig(data as ConfiguracionPagosAdmin | null));
  }, []);

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
          monto: PRECIO_STARTER_MENSUAL,
          comprobante_url: publicUrl.publicUrl,
          estado: 'pendiente',
        },
        { onConflict: 'operador_peru_id,periodo' }
      );
      if (upsertError) throw upsertError;

      await refreshUsuario();
      onEnviado?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (!usuario) return null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.subtitulo}>
        Suscripción S/ {PRECIO_STARTER_MENSUAL.toFixed(2)} / mes — período {periodoActual()}
      </Text>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Formas de pago</Text>
        <View style={styles.selectorRow}>
          <SelectorOpcion etiqueta="YAPE" seleccionado={formaPago === 'yape'} onPress={() => setFormaPago('yape')} />
          <SelectorOpcion etiqueta="Transferencia bancaria" seleccionado={formaPago === 'transferencia'} onPress={() => setFormaPago('transferencia')} />
        </View>

        {formaPago === 'yape' ? (
          <View style={{ marginTop: 4 }}>
            {config?.yape_telefono && <CopyField label="Yape" value={config.yape_telefono} />}
            {config?.plin_telefono && <CopyField label="Plin" value={config.plin_telefono} />}
            {config?.otro_medio_telefono && (
              <CopyField label={config.otro_medio_nombre || 'Otro medio de pago'} value={config.otro_medio_telefono} />
            )}
            {!config?.yape_telefono && !config?.plin_telefono && !config?.otro_medio_telefono && (
              <Text style={styles.avisoTexto}>El administrador todavía no cargó un teléfono de pago.</Text>
            )}
          </View>
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
    </View>
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
  subtitulo: { color: colors.textMuted, fontSize: 13 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4, width: '100%' },
  seccionTitulo: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  avisoTexto: { color: colors.text, fontSize: 13, lineHeight: 19 },
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
