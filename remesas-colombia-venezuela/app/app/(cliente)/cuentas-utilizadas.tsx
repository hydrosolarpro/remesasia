import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Platform, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { BeneficiarioCliente, BeneficiarioCuentaBancaria } from '../../types/database';
import { construirEnlaceWhatsApp } from '../../lib/whatsapp';
import { colors, radius, cardShadow } from '../../constants/theme';

type BeneficiarioConCuentas = BeneficiarioCliente & { cuentas: BeneficiarioCuentaBancaria[] };

type FormBeneficiario = { nombre: string; ci: string };
const FORM_BENEFICIARIO_VACIO: FormBeneficiario = { nombre: '', ci: '' };

type FormCuenta = { entidad_bancaria: string; numero_cuenta: string; telefono: string };
const FORM_CUENTA_VACIO: FormCuenta = { entidad_bancaria: '', numero_cuenta: '', telefono: '' };

const BOT_TELEGRAM = 'Remesaspv_bot';

const mensajeInvitacionTelegram = (nombreBeneficiario: string, enlace: string) =>
  `Hola ${nombreBeneficiario}. Te envío este enlace seguro para que puedas recibir las notificaciones de las transferencia que te envié, ` +
  `por favor vincula tu Telegram mediante este enlace: ${enlace} Pulsa Start para hacer efectiva la vinculación de notificaciones.`;

// CRUD de beneficiarios guardados por el cliente (Fase C: cada beneficiario
// puede tener varias cuentas bancarias, ya que puede recibir dinero por
// distintas entidades). Se usan como autocompletado en la calculadora,
// ver (cliente)/index.tsx.
export default function CuentasUtilizadas() {
  const { usuario } = useAuth();
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioConCuentas[]>([]);
  const [cargando, setCargando] = useState(true);

  const [editandoBeneficiarioId, setEditandoBeneficiarioId] = useState<string | null>(null);
  const [formBeneficiario, setFormBeneficiario] = useState<FormBeneficiario>(FORM_BENEFICIARIO_VACIO);
  const [mostrarFormNuevoBeneficiario, setMostrarFormNuevoBeneficiario] = useState(false);
  const [guardandoBeneficiario, setGuardandoBeneficiario] = useState(false);
  const [errorBeneficiario, setErrorBeneficiario] = useState<string | null>(null);

  const [agregandoCuentaEnId, setAgregandoCuentaEnId] = useState<string | null>(null);
  const [editandoCuentaId, setEditandoCuentaId] = useState<string | null>(null);
  const [formCuenta, setFormCuenta] = useState<FormCuenta>(FORM_CUENTA_VACIO);
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [errorCuenta, setErrorCuenta] = useState<string | null>(null);

  const [generandoTelegramId, setGenerandoTelegramId] = useState<string | null>(null);
  const [enlacesTelegram, setEnlacesTelegram] = useState<Record<string, string>>({});
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    const { data } = await supabase
      .from('beneficiarios_cliente')
      .select('*, cuentas:beneficiario_cuentas_bancarias(*)')
      .eq('cliente_id', usuario.id)
      .order('created_at', { ascending: false });
    setBeneficiarios((data as BeneficiarioConCuentas[] | null) ?? []);
    setCargando(false);
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // ── Beneficiario ──────────────────────────────────────────
  const abrirNuevoBeneficiario = () => {
    setEditandoBeneficiarioId(null);
    setFormBeneficiario(FORM_BENEFICIARIO_VACIO);
    setMostrarFormNuevoBeneficiario(true);
  };

  const abrirEdicionBeneficiario = (b: BeneficiarioConCuentas) => {
    setEditandoBeneficiarioId(b.id);
    setFormBeneficiario({ nombre: b.nombre, ci: b.ci });
    setMostrarFormNuevoBeneficiario(false);
  };

  const guardarBeneficiario = async () => {
    setErrorBeneficiario(null);
    if (!usuario || !formBeneficiario.nombre.trim() || !formBeneficiario.ci.trim()) {
      setErrorBeneficiario('Completa nombre y C.I.');
      return;
    }
    setGuardandoBeneficiario(true);
    const payload = { cliente_id: usuario.id, nombre: formBeneficiario.nombre.trim(), ci: formBeneficiario.ci.trim() };

    const { error } = editandoBeneficiarioId
      ? await supabase.from('beneficiarios_cliente').update(payload).eq('id', editandoBeneficiarioId)
      : await supabase.from('beneficiarios_cliente').upsert(payload, { onConflict: 'cliente_id,ci' });

    setGuardandoBeneficiario(false);
    if (error) {
      setErrorBeneficiario(error.message);
      return;
    }
    setMostrarFormNuevoBeneficiario(false);
    setEditandoBeneficiarioId(null);
    cargar();
  };

  const eliminarBeneficiario = (b: BeneficiarioConCuentas) => {
    const borrar = async () => {
      const { error } = await supabase.from('beneficiarios_cliente').delete().eq('id', b.id);
      if (error) {
        if (Platform.OS === 'web') window.alert(`No se pudo eliminar: ${error.message}`);
        else Alert.alert('No se pudo eliminar', error.message);
        return;
      }
      cargar();
    };

    const mensaje = `¿Eliminar a ${b.nombre} y todas sus cuentas bancarias guardadas?`;
    if (Platform.OS === 'web') {
      if (window.confirm(mensaje)) borrar();
      return;
    }
    Alert.alert('Eliminar beneficiario', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: borrar },
    ]);
  };

  // ── Cuenta bancaria ───────────────────────────────────────
  const abrirNuevaCuenta = (beneficiarioId: string) => {
    setAgregandoCuentaEnId(beneficiarioId);
    setEditandoCuentaId(null);
    setFormCuenta(FORM_CUENTA_VACIO);
    setErrorCuenta(null);
  };

  const abrirEdicionCuenta = (beneficiarioId: string, c: BeneficiarioCuentaBancaria) => {
    setAgregandoCuentaEnId(beneficiarioId);
    setEditandoCuentaId(c.id);
    setFormCuenta({ entidad_bancaria: c.entidad_bancaria, numero_cuenta: c.numero_cuenta, telefono: c.telefono ?? '' });
    setErrorCuenta(null);
  };

  const cerrarFormCuenta = () => {
    setAgregandoCuentaEnId(null);
    setEditandoCuentaId(null);
  };

  const guardarCuenta = async (beneficiarioId: string) => {
    setErrorCuenta(null);
    if (!formCuenta.entidad_bancaria.trim() || !formCuenta.numero_cuenta.trim()) {
      setErrorCuenta('Completa entidad y número de cuenta.');
      return;
    }
    setGuardandoCuenta(true);
    const payload = {
      beneficiario_id: beneficiarioId,
      entidad_bancaria: formCuenta.entidad_bancaria.trim(),
      numero_cuenta: formCuenta.numero_cuenta.trim(),
      telefono: formCuenta.telefono.trim() || null,
    };

    const { error } = editandoCuentaId
      ? await supabase.from('beneficiario_cuentas_bancarias').update(payload).eq('id', editandoCuentaId)
      : await supabase.from('beneficiario_cuentas_bancarias').insert(payload);

    setGuardandoCuenta(false);
    if (error) {
      setErrorCuenta(error.message);
      return;
    }
    cerrarFormCuenta();
    cargar();
  };

  const eliminarCuenta = (c: BeneficiarioCuentaBancaria) => {
    const borrar = async () => {
      const { error } = await supabase.from('beneficiario_cuentas_bancarias').delete().eq('id', c.id);
      if (error) {
        if (Platform.OS === 'web') window.alert(`No se pudo eliminar: ${error.message}`);
        else Alert.alert('No se pudo eliminar', error.message);
        return;
      }
      cargar();
    };

    const mensaje = `¿Eliminar la cuenta ${c.entidad_bancaria} · ${c.numero_cuenta}?`;
    if (Platform.OS === 'web') {
      if (window.confirm(mensaje)) borrar();
      return;
    }
    Alert.alert('Eliminar cuenta', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: borrar },
    ]);
  };

  // ── Telegram (vinculado al beneficiario, no a la cuenta) ───
  const generarEnlaceTelegram = async (b: BeneficiarioConCuentas) => {
    setGenerandoTelegramId(b.id);
    const { data: token, error: tokenError } = await supabase.rpc('generar_token_telegram_beneficiario', { p_beneficiario_id: b.id });
    setGenerandoTelegramId(null);
    if (tokenError || !token) {
      const msg = tokenError?.message ?? 'No se pudo generar el enlace.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('No se pudo generar el enlace', msg);
      return;
    }
    setEnlacesTelegram((prev) => ({ ...prev, [b.id]: `https://t.me/${BOT_TELEGRAM}?start=${token}` }));
  };

  const copiarEnlace = async (id: string, enlace: string) => {
    await Clipboard.setStringAsync(enlace);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId((actual) => (actual === id ? null : actual)), 2500);
  };

  const enviarEnlacePorWhatsApp = (b: BeneficiarioConCuentas, telefono: string | null, enlace: string) => {
    const wa = construirEnlaceWhatsApp(telefono, mensajeInvitacionTelegram(b.nombre, enlace));
    if (!wa) {
      const msg = 'Agrega el teléfono del beneficiario (en alguna de sus cuentas) para poder enviarle el enlace por WhatsApp.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Falta el teléfono', msg);
      return;
    }
    Linking.openURL(wa);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Cuentas de beneficiarios guardadas</Text>
      <Text style={styles.subtitulo}>Cada beneficiario puede tener varias cuentas bancarias. Se usan para autocompletar tus solicitudes.</Text>

      {!cargando &&
        beneficiarios.map((b) =>
          editandoBeneficiarioId === b.id ? (
            <View key={b.id} style={[styles.card, cardShadow]}>
              <FormularioBeneficiario
                form={formBeneficiario}
                setForm={setFormBeneficiario}
                error={errorBeneficiario}
                guardando={guardandoBeneficiario}
                onCancelar={() => setEditandoBeneficiarioId(null)}
                onGuardar={guardarBeneficiario}
              />
            </View>
          ) : (
            <View key={b.id} style={[styles.card, cardShadow]}>
              <View style={styles.cardHeader}>
                <Text style={styles.nombre}>{b.nombre}</Text>
                <View style={styles.acciones}>
                  <Pressable onPress={() => abrirEdicionBeneficiario(b)}>
                    <Text style={styles.editar}>Editar</Text>
                  </Pressable>
                  <Pressable onPress={() => eliminarBeneficiario(b)}>
                    <Text style={styles.eliminar}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.dato}>C.I. {b.ci}</Text>

              <Text style={styles.cuentasTitulo}>Cuentas bancarias</Text>
              {b.cuentas.length === 0 && agregandoCuentaEnId !== b.id && <Text style={styles.vacioCuentas}>Aún no agregaste ninguna cuenta.</Text>}
              {b.cuentas.map((c) =>
                editandoCuentaId === c.id ? (
                  <View key={c.id} style={styles.cuentaFormBox}>
                    <FormularioCuenta
                      form={formCuenta}
                      setForm={setFormCuenta}
                      error={errorCuenta}
                      guardando={guardandoCuenta}
                      onCancelar={cerrarFormCuenta}
                      onGuardar={() => guardarCuenta(b.id)}
                    />
                  </View>
                ) : (
                  <View key={c.id} style={styles.cuentaFila}>
                    <Text style={styles.cuentaDato} numberOfLines={1}>
                      {c.entidad_bancaria} · {c.numero_cuenta}
                      {c.telefono ? ` · ${c.telefono}` : ''}
                    </Text>
                    <View style={styles.acciones}>
                      <Pressable onPress={() => abrirEdicionCuenta(b.id, c)}>
                        <Text style={styles.editar}>Editar</Text>
                      </Pressable>
                      <Pressable onPress={() => eliminarCuenta(c)}>
                        <Text style={styles.eliminar}>Eliminar</Text>
                      </Pressable>
                    </View>
                  </View>
                )
              )}

              {agregandoCuentaEnId === b.id && editandoCuentaId === null ? (
                <View style={styles.cuentaFormBox}>
                  <FormularioCuenta
                    form={formCuenta}
                    setForm={setFormCuenta}
                    error={errorCuenta}
                    guardando={guardandoCuenta}
                    onCancelar={cerrarFormCuenta}
                    onGuardar={() => guardarCuenta(b.id)}
                  />
                </View>
              ) : (
                <Pressable style={styles.agregarCuentaBtn} onPress={() => abrirNuevaCuenta(b.id)}>
                  <Text style={styles.agregarCuentaBtnTexto}>+ Agregar cuenta</Text>
                </Pressable>
              )}

              <View style={styles.telegramBloque}>
                <Text style={styles.telegramTitulo}>Configuración de notificaciones del beneficiario</Text>
                {b.telegram_connected ? (
                  <Text style={styles.telegramConectado}>✓ Telegram vinculado{b.telegram_username ? ` (@${b.telegram_username})` : ''}</Text>
                ) : enlacesTelegram[b.id] ? (
                  <View style={styles.telegramAcciones}>
                    <Pressable style={styles.telegramBoton} onPress={() => copiarEnlace(b.id, enlacesTelegram[b.id])}>
                      <Text style={styles.telegramBotonTexto}>{copiadoId === b.id ? '✓ Copiado' : 'Copiar enlace'}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.telegramBotonWhatsapp}
                      onPress={() => enviarEnlacePorWhatsApp(b, b.cuentas[0]?.telefono ?? null, enlacesTelegram[b.id])}
                    >
                      <Text style={styles.telegramBotonWhatsappTexto}>Enviar por WhatsApp</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.telegramBoton} onPress={() => generarEnlaceTelegram(b)} disabled={generandoTelegramId === b.id}>
                    <Text style={styles.telegramBotonTexto}>
                      {generandoTelegramId === b.id ? 'Generando…' : 'Vincular Telegram del beneficiario'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )
        )}

      {!cargando && beneficiarios.length === 0 && !mostrarFormNuevoBeneficiario && <Text style={styles.vacio}>Aún no guardaste ningún beneficiario.</Text>}

      {mostrarFormNuevoBeneficiario ? (
        <View style={[styles.card, cardShadow]}>
          <FormularioBeneficiario
            form={formBeneficiario}
            setForm={setFormBeneficiario}
            error={errorBeneficiario}
            guardando={guardandoBeneficiario}
            onCancelar={() => setMostrarFormNuevoBeneficiario(false)}
            onGuardar={guardarBeneficiario}
          />
        </View>
      ) : (
        <Pressable style={styles.agregarBtn} onPress={abrirNuevoBeneficiario}>
          <Text style={styles.agregarBtnTexto}>+ Agregar beneficiario</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function FormularioBeneficiario({
  form,
  setForm,
  error,
  guardando,
  onCancelar,
  onGuardar,
}: {
  form: FormBeneficiario;
  setForm: (updater: (f: FormBeneficiario) => FormBeneficiario) => void;
  error: string | null;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: () => void;
}) {
  return (
    <>
      <Field label="Nombre completo" value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} />
      <Field label="Cédula (C.I.)" value={form.ci} onChangeText={(v) => setForm((f) => ({ ...f, ci: v }))} />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.formBotones}>
        <Pressable style={styles.botonCancelar} onPress={onCancelar}>
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </Pressable>
        <Pressable style={styles.botonGuardar} onPress={onGuardar} disabled={guardando}>
          <Text style={styles.botonGuardarTexto}>{guardando ? 'Guardando…' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </>
  );
}

function FormularioCuenta({
  form,
  setForm,
  error,
  guardando,
  onCancelar,
  onGuardar,
}: {
  form: FormCuenta;
  setForm: (updater: (f: FormCuenta) => FormCuenta) => void;
  error: string | null;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: () => void;
}) {
  return (
    <>
      <Field label="Entidad bancaria" value={form.entidad_bancaria} onChangeText={(v) => setForm((f) => ({ ...f, entidad_bancaria: v }))} />
      <Field label="N° de cuenta" value={form.numero_cuenta} onChangeText={(v) => setForm((f) => ({ ...f, numero_cuenta: v }))} keyboardType="numeric" />
      <Field
        label="Teléfono de esta cuenta (opcional)"
        value={form.telefono}
        onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))}
        keyboardType="phone-pad"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.formBotones}>
        <Pressable style={styles.botonCancelar} onPress={onCancelar}>
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </Pressable>
        <Pressable style={styles.botonGuardar} onPress={onGuardar} disabled={guardando}>
          <Text style={styles.botonGuardarTexto}>{guardando ? 'Guardando…' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </>
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
  titulo: { color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 15, marginTop: -6, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4 },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nombre: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1, minWidth: 80 },
  acciones: { flexDirection: 'row', gap: 12 },
  editar: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  eliminar: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 14 },
  vacio: { color: colors.textMuted, fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 12 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, fontSize: 17, marginTop: 5, backgroundColor: colors.cardAlt },
  error: { color: colors.danger, fontSize: 14, marginTop: 10 },
  formBotones: { flexDirection: 'row', gap: 10, marginTop: 14 },
  botonCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  botonCancelarTexto: { color: colors.textMuted, fontWeight: '700' },
  botonGuardar: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  botonGuardarTexto: { color: colors.text, fontWeight: '700' },
  agregarBtn: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.md, padding: 16, alignItems: 'center' },
  agregarBtnTexto: { color: colors.accent, fontWeight: '700' },
  cuentasTitulo: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginTop: 8 },
  vacioCuentas: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  cuentaFila: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 4 },
  cuentaDato: { color: colors.text, fontSize: 14, flex: 1, minWidth: 120 },
  cuentaFormBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, marginTop: 4 },
  agregarCuentaBtn: { borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: radius.sm, padding: 10, alignItems: 'center', marginTop: 4 },
  agregarCuentaBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  telegramBloque: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10, gap: 8 },
  telegramTitulo: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  telegramConectado: { color: colors.success, fontSize: 14, fontWeight: '700' },
  telegramAcciones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  telegramBoton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  telegramBotonTexto: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  telegramBotonWhatsapp: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  telegramBotonWhatsappTexto: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
