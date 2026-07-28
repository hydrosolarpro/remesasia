import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Platform, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { CuentaUtilizadaCliente } from '../../types/database';
import { construirEnlaceWhatsApp } from '../../lib/whatsapp';
import { colors, radius, cardShadow } from '../../constants/theme';

type Form = Omit<
  CuentaUtilizadaCliente,
  'id' | 'cliente_id' | 'created_at' | 'telegram_chat_id' | 'telegram_username' | 'telegram_connected' | 'telegram_connected_at'
>;
const FORM_VACIO: Form = { nombre_beneficiario: '', telefono: '', ci: '', entidad_bancaria: '', numero_cuenta: '' };

const BOT_TELEGRAM = 'Remesaspv_bot';

const mensajeInvitacionTelegram = (nombreBeneficiario: string, enlace: string) =>
  `Hola ${nombreBeneficiario}. Te envío este enlace seguro para que puedas recibir las notificaciones de las transferencia que te envié, ` +
  `por favor vincula tu Telegram mediante este enlace: ${enlace} Pulsa Start para hacer efectiva la vinculación de notificaciones.`;

// CRUD de "Datos de cuentas utilizados": beneficiarios guardados por el
// cliente para no volver a llenarlos cada vez (se usan como autocompletado
// en la calculadora, ver (cliente)/index.tsx).
export default function CuentasUtilizadas() {
  const { usuario } = useAuth();
  const [cuentas, setCuentas] = useState<CuentaUtilizadaCliente[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generandoTelegramId, setGenerandoTelegramId] = useState<string | null>(null);
  const [enlacesTelegram, setEnlacesTelegram] = useState<Record<string, string>>({});
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const { data } = await supabase
      .from('cuentas_utilizadas_cliente')
      .select('*')
      .eq('cliente_id', usuario.id)
      .order('created_at', { ascending: false });
    setCuentas((data as CuentaUtilizadaCliente[] | null) ?? []);
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const abrirNueva = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setMostrarForm(true);
  };

  const abrirEdicion = (c: CuentaUtilizadaCliente) => {
    setEditandoId(c.id);
    setForm({
      nombre_beneficiario: c.nombre_beneficiario,
      telefono: c.telefono,
      ci: c.ci,
      entidad_bancaria: c.entidad_bancaria,
      numero_cuenta: c.numero_cuenta,
    });
    setMostrarForm(true);
  };

  const guardar = async () => {
    setError(null);
    if (!usuario || !form.nombre_beneficiario.trim() || !form.ci.trim() || !form.entidad_bancaria.trim() || !form.numero_cuenta.trim()) {
      setError('Completa nombre, C.I., entidad y número de cuenta.');
      return;
    }
    setGuardando(true);
    const payload = {
      cliente_id: usuario.id,
      nombre_beneficiario: form.nombre_beneficiario.trim(),
      telefono: form.telefono?.trim() || null,
      ci: form.ci.trim(),
      entidad_bancaria: form.entidad_bancaria.trim(),
      numero_cuenta: form.numero_cuenta.trim(),
    };

    const { error: guardarError } = editandoId
      ? await supabase.from('cuentas_utilizadas_cliente').update(payload).eq('id', editandoId)
      : await supabase.from('cuentas_utilizadas_cliente').upsert(payload, { onConflict: 'cliente_id,ci,numero_cuenta' });

    setGuardando(false);
    if (guardarError) {
      setError(guardarError.message);
      return;
    }
    setMostrarForm(false);
    cargar();
  };

  const eliminar = (c: CuentaUtilizadaCliente) => {
    const borrar = async () => {
      const { error } = await supabase.from('cuentas_utilizadas_cliente').delete().eq('id', c.id);
      if (error) {
        if (Platform.OS === 'web') window.alert(`No se pudo eliminar: ${error.message}`);
        else Alert.alert('No se pudo eliminar', error.message);
        return;
      }
      cargar();
    };

    // Alert.alert con varios botones no siempre dispara el onPress en web
    // (react-native-web lo reduce a un solo confirm); en web se usa
    // window.confirm directamente para que el botón funcione siempre.
    if (Platform.OS === 'web') {
      if (window.confirm(`¿Eliminar los datos de ${c.nombre_beneficiario}?`)) borrar();
      return;
    }
    Alert.alert('Eliminar cuenta', `¿Eliminar los datos de ${c.nombre_beneficiario}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: borrar },
    ]);
  };

  const generarEnlaceTelegram = async (c: CuentaUtilizadaCliente) => {
    setGenerandoTelegramId(c.id);
    const { data: token, error: tokenError } = await supabase.rpc('generar_token_telegram_beneficiario', { p_beneficiario_id: c.id });
    setGenerandoTelegramId(null);
    if (tokenError || !token) {
      const msg = tokenError?.message ?? 'No se pudo generar el enlace.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('No se pudo generar el enlace', msg);
      return;
    }
    setEnlacesTelegram((prev) => ({ ...prev, [c.id]: `https://t.me/${BOT_TELEGRAM}?start=${token}` }));
  };

  const copiarEnlace = async (id: string, enlace: string) => {
    await Clipboard.setStringAsync(enlace);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId((actual) => (actual === id ? null : actual)), 2500);
  };

  const enviarEnlacePorWhatsApp = (c: CuentaUtilizadaCliente, enlace: string) => {
    const wa = construirEnlaceWhatsApp(c.telefono, mensajeInvitacionTelegram(c.nombre_beneficiario, enlace));
    if (!wa) {
      const msg = 'Agrega el teléfono del beneficiario (con código de país) para poder enviarle el enlace por WhatsApp.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Falta el teléfono', msg);
      return;
    }
    Linking.openURL(wa);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Cuentas de beneficiarios guardadas</Text>
      <Text style={styles.subtitulo}>Se usan para autocompletar tus solicitudes.</Text>

      {cuentas.map((c) => (
        <View key={c.id} style={[styles.card, cardShadow]}>
          <View style={styles.cardHeader}>
            <Text style={styles.nombre}>{c.nombre_beneficiario}</Text>
            <View style={styles.acciones}>
              <Pressable onPress={() => abrirEdicion(c)}>
                <Text style={styles.editar}>Editar</Text>
              </Pressable>
              <Pressable onPress={() => eliminar(c)}>
                <Text style={styles.eliminar}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.dato}>C.I. {c.ci} · {c.telefono ?? 'sin teléfono'}</Text>
          <Text style={styles.dato}>{c.entidad_bancaria} · {c.numero_cuenta}</Text>

          <View style={styles.telegramBloque}>
            <Text style={styles.telegramTitulo}>Configuración de notificaciones del beneficiario</Text>
            {c.telegram_connected ? (
              <Text style={styles.telegramConectado}>✓ Telegram vinculado{c.telegram_username ? ` (@${c.telegram_username})` : ''}</Text>
            ) : enlacesTelegram[c.id] ? (
              <View style={styles.telegramAcciones}>
                <Pressable style={styles.telegramBoton} onPress={() => copiarEnlace(c.id, enlacesTelegram[c.id])}>
                  <Text style={styles.telegramBotonTexto}>{copiadoId === c.id ? '✓ Copiado' : 'Copiar enlace'}</Text>
                </Pressable>
                <Pressable style={styles.telegramBotonWhatsapp} onPress={() => enviarEnlacePorWhatsApp(c, enlacesTelegram[c.id])}>
                  <Text style={styles.telegramBotonWhatsappTexto}>Enviar por WhatsApp</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.telegramBoton} onPress={() => generarEnlaceTelegram(c)} disabled={generandoTelegramId === c.id}>
                <Text style={styles.telegramBotonTexto}>
                  {generandoTelegramId === c.id ? 'Generando…' : 'Vincular Telegram del beneficiario'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      {cuentas.length === 0 && !mostrarForm && <Text style={styles.vacio}>Aún no guardaste ninguna cuenta.</Text>}

      {mostrarForm ? (
        <View style={[styles.card, cardShadow]}>
          <Field label="Nombre completo" value={form.nombre_beneficiario} onChangeText={(v) => setForm((f) => ({ ...f, nombre_beneficiario: v }))} />
          <Field label="Teléfono" value={form.telefono ?? ''} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" />
          <Field label="Cédula (C.I.)" value={form.ci} onChangeText={(v) => setForm((f) => ({ ...f, ci: v }))} />
          <Field label="Entidad bancaria" value={form.entidad_bancaria} onChangeText={(v) => setForm((f) => ({ ...f, entidad_bancaria: v }))} />
          <Field label="N° de cuenta" value={form.numero_cuenta} onChangeText={(v) => setForm((f) => ({ ...f, numero_cuenta: v }))} keyboardType="numeric" />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.formBotones}>
            <Pressable style={styles.botonCancelar} onPress={() => setMostrarForm(false)}>
              <Text style={styles.botonCancelarTexto}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.botonGuardar} onPress={guardar} disabled={guardando}>
              <Text style={styles.botonGuardarTexto}>{guardando ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.agregarBtn} onPress={abrirNueva}>
          <Text style={styles.agregarBtnTexto}>+ Agregar cuenta</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor={colors.textMuted} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 13, marginTop: -6, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { color: colors.text, fontSize: 15, fontWeight: '700' },
  acciones: { flexDirection: 'row', gap: 12 },
  editar: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  eliminar: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 12 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, fontSize: 15, marginTop: 5, backgroundColor: colors.cardAlt },
  error: { color: colors.danger, fontSize: 12, marginTop: 10 },
  formBotones: { flexDirection: 'row', gap: 10, marginTop: 14 },
  botonCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  botonCancelarTexto: { color: colors.textMuted, fontWeight: '700' },
  botonGuardar: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  botonGuardarTexto: { color: colors.text, fontWeight: '700' },
  agregarBtn: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.md, padding: 16, alignItems: 'center' },
  agregarBtnTexto: { color: colors.accent, fontWeight: '700' },
  telegramBloque: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10, gap: 8 },
  telegramTitulo: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  telegramConectado: { color: colors.success, fontSize: 12, fontWeight: '700' },
  telegramAcciones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  telegramBoton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  telegramBotonTexto: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  telegramBotonWhatsapp: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  telegramBotonWhatsappTexto: { color: colors.text, fontSize: 12, fontWeight: '700' },
});
