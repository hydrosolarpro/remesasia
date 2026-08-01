import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { CopyField } from './CopyField';
import { extensionDeImagen, validarTamanoImagen, MAX_IMAGEN_KB } from '../lib/imagenUtil';
import { ConfiguracionPagosAdmin } from '../types/database';
import { PRECIO_PLAN, planLabel } from '../lib/plan';
import { colors, radius, cardShadow } from '../constants/theme';

const periodoActual = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

type FormaPago = 'yape' | 'transferencia';

// Formulario de solicitud de pago de la suscripción (upsert en
// pagos_suscripcion, a la espera de aprobación del admin). Se usa tanto
// dentro de SuscripcionGate (cuando el DEMO ya venció, siempre para
// STARTER) como desde "Próxima Meta" en Perfil (operador solicitando
// subir a un plan superior específico). El monto define qué plan asigna
// el admin al aprobar (ver planDesdeMonto) -- solo UNLIMITED no tiene
// precio fijo (se acuerda directamente con el administrador), así que pide
// un monto manual en vez de uno fijo.
export function FormularioSolicitudPlan({ plan, onEnviado }: { plan: string; onEnviado?: () => void }) {
  const { usuario, refreshUsuario } = useAuth();
  const [config, setConfig] = useState<ConfiguracionPagosAdmin | null>(null);
  const [formaPago, setFormaPago] = useState<FormaPago>('yape');
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [comprobanteExt, setComprobanteExt] = useState('jpg');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [montoManual, setMontoManual] = useState('');

  const montoFijo = PRECIO_PLAN[plan];
  const requiereMontoManual = montoFijo === undefined; // unlimited
  const monto = requiereMontoManual ? Number(montoManual.replace(',', '.')) || 0 : montoFijo;

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
    if (resultado.canceled) return;
    if (!(await validarTamanoImagen(resultado.assets[0]))) {
      Alert.alert('Imagen muy pesada', `La imagen supera el límite de ${MAX_IMAGEN_KB} KB. Elige una más liviana.`);
      return;
    }
    setComprobanteUri(resultado.assets[0].uri);
    setComprobanteExt(extensionDeImagen(resultado.assets[0]));
  };

  const enviarSolicitud = async () => {
    setError(null);
    if (!usuario) return;
    if (!aceptaTerminos) {
      setError('Debes leer y aceptar los Términos y Condiciones para enviar la solicitud.');
      return;
    }
    if (!nombre.trim() || !telefono.trim()) {
      setError('Completa tu nombre completo y teléfono.');
      return;
    }
    if (requiereMontoManual && monto <= 0) {
      setError('Ingresa el monto acordado con el administrador.');
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
          monto,
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
        Solicitud de plan {planLabel(plan)} {requiereMontoManual ? '' : `— S/ ${monto.toFixed(2)} / mes`} — período {periodoActual()}
      </Text>

      {requiereMontoManual && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.seccionTitulo}>Monto acordado con el administrador</Text>
          <Text style={styles.label}>Monto mensual (S/)</Text>
          <TextInput
            style={styles.input}
            value={montoManual}
            onChangeText={setMontoManual}
            keyboardType="decimal-pad"
            placeholder="Ej. 800.00"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      )}

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

      <View style={[styles.card, cardShadow, styles.terminosBox]}>
        <Text style={styles.terminosTitulo}>Términos y condiciones de uso de la plataforma Remesas PERÚ-VENEZUELA</Text>
        <Text style={styles.terminosTexto}>
          Importante: antes de enviar tu solicitud de plan {planLabel(plan)} debes leer los Términos y Condiciones de Uso. Al
          marcar la aceptación declaras que los leíste, comprendiste y aceptas íntegramente. No se puede enviar la solicitud sin
          aceptarlos.
        </Text>
        <Pressable onPress={() => Linking.openURL('/legal/terminos-legales-remesas-peru-venezuela.pdf')}>
          <Text style={styles.linkPdf}>📁 Descargar TÉRMINOS LEGALES Y DE USO DE REMESAS PERÚ-VENEZUELA (PDF)</Text>
        </Pressable>
        <View style={styles.terminosAceptacion}>
          <TouchableOpacity onPress={() => setAceptaTerminos((v) => !v)} style={styles.checkboxContainer}>
            <Text style={[styles.checkbox, aceptaTerminos && styles.checkboxActivo]}>{aceptaTerminos ? '☑' : '☐'}</Text>
          </TouchableOpacity>
          <Text style={[styles.terminosTexto, styles.terminosTextoFlex, aceptaTerminos && styles.terminosTextoAceptado]}>
            {aceptaTerminos
              ? '✅ Términos y Condiciones aceptados.'
              : 'He leído y acepto los Términos y Condiciones de Uso.'}
          </Text>
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.enviarBtn, !aceptaTerminos && styles.enviarBtnDeshabilitado]} onPress={enviarSolicitud} disabled={enviando || !aceptaTerminos}>
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
  subtitulo: { color: colors.textMuted, fontSize: 15 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4, width: '100%' },
  seccionTitulo: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  avisoTexto: { color: colors.text, fontSize: 15, lineHeight: 19 },
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
  opcionTexto: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
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
  subirBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  comprobantePreview: { width: '100%', height: 160, borderRadius: radius.sm },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 17,
    marginTop: 5,
    backgroundColor: colors.cardAlt,
  },
  inputDisabled: { justifyContent: 'center', opacity: 0.7 },
  inputDisabledText: { color: colors.textMuted, fontSize: 17 },
  error: { color: colors.danger, fontSize: 15 },
  enviarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  enviarBtnDeshabilitado: { opacity: 0.5 },
  enviarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 18 },
  terminosBox: { borderColor: colors.primary, gap: 8 },
  terminosTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  terminosTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 18 },
  terminosTextoFlex: { flex: 1 },
  terminosTextoAceptado: { color: colors.success, fontWeight: '700' },
  linkPdf: { color: colors.accent, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  terminosAceptacion: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkboxContainer: { padding: 4 },
  checkbox: { fontSize: 23, color: colors.textMuted },
  checkboxActivo: { color: colors.success },
});
