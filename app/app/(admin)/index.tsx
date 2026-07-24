import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { crearInvitacion, construirEnlaceInvitacion } from '../../lib/invitaciones';
import { RoleTag } from '../../components/RoleTag';
import { ConfiguracionPagosAdmin } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

interface OperadorPeru {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  created_at: string;
  perfil_negocio: { nombre_negocio: string } | null;
}

interface PagoPendiente {
  id: string;
  operador_peru_id: string;
  periodo: string;
  monto: number;
  comprobante_url: string | null;
  created_at: string;
  operador: { nombre: string; email: string | null } | null;
}

export default function PanelAdmin() {
  const { usuario, signOut } = useAuth();
  const [operadores, setOperadores] = useState<OperadorPeru[]>([]);
  const [pagosPendientes, setPagosPendientes] = useState<PagoPendiente[]>([]);
  const [config, setConfig] = useState<ConfiguracionPagosAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enlaceInvitacion, setEnlaceInvitacion] = useState<string | null>(null);
  const [generandoInvitacion, setGenerandoInvitacion] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const [{ data: ops }, { data: pagos }, { data: configData }] = await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nombre, email, telefono, created_at, perfil_negocio(nombre_negocio)')
        .eq('rol', 'operador_peru')
        .order('created_at', { ascending: false }),
      supabase
        .from('pagos_suscripcion')
        .select('*, operador:usuarios!pagos_suscripcion_operador_peru_id_fkey(nombre, email)')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false }),
      supabase.from('configuracion_pagos_admin').select('*').maybeSingle(),
    ]);
    setOperadores((ops as unknown as OperadorPeru[] | null) ?? []);
    setPagosPendientes((pagos as unknown as PagoPendiente[] | null) ?? []);
    setConfig(configData as ConfiguracionPagosAdmin | null);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const invitarOperador = async () => {
    setGenerandoInvitacion(true);
    setCopiado(false);
    try {
      const inv = await crearInvitacion('operador_peru');
      setEnlaceInvitacion(construirEnlaceInvitacion(inv.token));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo crear la invitación.');
    } finally {
      setGenerandoInvitacion(false);
    }
  };

  const copiarEnlace = async () => {
    if (!enlaceInvitacion) return;
    await Clipboard.setStringAsync(enlaceInvitacion);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const resolverPago = async (pago: PagoPendiente, estado: 'verificado' | 'rechazado', motivo?: string) => {
    setProcesandoPago(pago.id);
    const { error } = await supabase
      .from('pagos_suscripcion')
      .update({ estado, verificado_por: usuario!.id, verificado_at: new Date().toISOString(), motivo_rechazo: motivo ?? null })
      .eq('id', pago.id);
    setProcesandoPago(null);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    cargar();
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol="administrador" />
      <Text style={styles.titulo}>Panel de Administrador</Text>
      <Text style={styles.subtitulo}>{usuario?.email}</Text>

      <Section titulo="Invitar Operador Perú">
        <Text style={styles.texto}>Genera un enlace y compártelo por WhatsApp. Al abrirlo, esa persona entra directo como Operador Perú.</Text>
        <Pressable style={styles.boton} onPress={invitarOperador} disabled={generandoInvitacion}>
          {generandoInvitacion ? <ActivityIndicator color={colors.text} /> : <Text style={styles.botonTexto}>Generar enlace</Text>}
        </Pressable>
        {enlaceInvitacion && (
          <View style={styles.enlaceRow}>
            <Text style={styles.enlaceTexto} numberOfLines={1}>
              {enlaceInvitacion}
            </Text>
            <Pressable style={styles.copiarBtn} onPress={copiarEnlace}>
              <Text style={styles.copiarBtnTexto}>{copiado ? '✓ Copiado' : 'Copiar'}</Text>
            </Pressable>
          </View>
        )}
      </Section>

      <Section titulo={`Pagos pendientes de verificar (${pagosPendientes.length})`}>
        {cargando && <ActivityIndicator color={colors.primary} />}
        {!cargando && pagosPendientes.length === 0 && <Text style={styles.vacio}>No hay pagos por verificar.</Text>}
        {pagosPendientes.map((pago) => (
          <View key={pago.id} style={styles.pagoCard}>
            <Text style={styles.nombre}>{pago.operador?.nombre ?? 'Operador'}</Text>
            <Text style={styles.dato}>{pago.operador?.email}</Text>
            <Text style={styles.dato}>
              Período {pago.periodo} · S/ {pago.monto.toFixed(2)}
            </Text>
            {pago.comprobante_url && <Image source={{ uri: pago.comprobante_url }} style={styles.comprobante} resizeMode="contain" />}

            {rechazandoId === pago.id ? (
              <View style={{ gap: 6, marginTop: 8 }}>
                <TextInput
                  style={styles.input}
                  value={motivoRechazo}
                  onChangeText={setMotivoRechazo}
                  placeholder="Motivo del rechazo (opcional)"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <View style={styles.accionesRow}>
                  <Pressable
                    style={styles.rechazarBtn}
                    onPress={() => {
                      resolverPago(pago, 'rechazado', motivoRechazo.trim() || undefined);
                      setRechazandoId(null);
                      setMotivoRechazo('');
                    }}
                    disabled={procesandoPago === pago.id}
                  >
                    <Text style={styles.rechazarBtnSolidTexto}>Confirmar rechazo</Text>
                  </Pressable>
                  <Pressable
                    style={styles.cancelarBtn}
                    onPress={() => {
                      setRechazandoId(null);
                      setMotivoRechazo('');
                    }}
                  >
                    <Text style={styles.cancelarBtnTexto}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.accionesRow}>
                <Pressable
                  style={styles.aprobarBtn}
                  onPress={() => resolverPago(pago, 'verificado')}
                  disabled={procesandoPago === pago.id}
                >
                  <Text style={styles.aprobarBtnTexto}>{procesandoPago === pago.id ? '...' : 'Aprobar'}</Text>
                </Pressable>
                <Pressable
                  style={styles.rechazarBtnOutline}
                  onPress={() => {
                    setRechazandoId(pago.id);
                    setMotivoRechazo('');
                  }}
                  disabled={procesandoPago === pago.id}
                >
                  <Text style={styles.rechazarBtnTexto}>Rechazar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </Section>

      <ConfiguracionPagosSection config={config} onGuardado={cargar} />

      <Section titulo={`Operadores Perú registrados (${operadores.length})`}>
        {operadores.length === 0 && <Text style={styles.vacio}>Todavía no hay ningún Operador Perú registrado.</Text>}
        {operadores.map((item) => (
          <View key={item.id} style={styles.pagoCard}>
            <Text style={styles.nombre}>{item.nombre}</Text>
            {item.perfil_negocio?.nombre_negocio ? <Text style={styles.negocio}>{item.perfil_negocio.nombre_negocio}</Text> : null}
            <Text style={styles.dato}>{item.email ?? 'Sin correo'}</Text>
            <Text style={styles.dato}>{item.telefono ?? 'Sin teléfono'}</Text>
            <Text style={styles.fecha}>Registrado el {new Date(item.created_at).toLocaleDateString('es-PE')}</Text>
          </View>
        ))}
      </Section>

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function ConfiguracionPagosSection({ config, onGuardado }: { config: ConfiguracionPagosAdmin | null; onGuardado: () => void }) {
  const [banco, setBanco] = useState(config?.banco ?? '');
  const [cuenta, setCuenta] = useState(config?.cuenta_soles ?? '');
  const [cci, setCci] = useState(config?.cci ?? '');
  const [titular, setTitular] = useState(config?.titular ?? '');
  const [monto, setMonto] = useState(String(config?.monto_suscripcion ?? 50));
  const [yapeQrUrl, setYapeQrUrl] = useState(config?.yape_qr_url ?? null);
  const [plinQrUrl, setPlinQrUrl] = useState(config?.plin_qr_url ?? null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState<null | 'yape' | 'plin'>(null);

  const subirQr = async (tipo: 'yape' | 'plin') => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return;
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (resultado.canceled) return;

    setSubiendo(tipo);
    const archivo = resultado.assets[0];
    const ext = archivo.uri.split('.').pop() ?? 'jpg';
    const path = `admin/config/${tipo}.${ext}`;
    const blob = await (await fetch(archivo.uri)).blob();
    const { error } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
    setSubiendo(null);
    if (error) {
      Alert.alert('Error al subir', error.message);
      return;
    }
    const { data } = supabase.storage.from('comprobantes').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    if (tipo === 'yape') setYapeQrUrl(url);
    else setPlinQrUrl(url);
  };

  const guardar = async () => {
    setGuardando(true);
    const payload = {
      banco: banco.trim(),
      cuenta_soles: cuenta.trim(),
      cci: cci.trim(),
      titular: titular.trim(),
      monto_suscripcion: Number(monto.replace(',', '.')) || 50,
      yape_qr_url: yapeQrUrl,
      plin_qr_url: plinQrUrl,
    };
    const { error } = config
      ? await supabase.from('configuracion_pagos_admin').update(payload).eq('id', config.id)
      : await supabase.from('configuracion_pagos_admin').insert(payload);
    setGuardando(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    onGuardado();
  };

  return (
    <Section titulo="Configuración de pagos (lo que ve el Operador Perú)">
      <Label texto="Banco" />
      <TextInput style={styles.input} value={banco} onChangeText={setBanco} placeholderTextColor={colors.textMuted} />
      <Label texto="Cuenta soles" />
      <TextInput style={styles.input} value={cuenta} onChangeText={setCuenta} placeholderTextColor={colors.textMuted} />
      <Label texto="CCI" />
      <TextInput style={styles.input} value={cci} onChangeText={setCci} placeholderTextColor={colors.textMuted} />
      <Label texto="Titular" />
      <TextInput style={styles.input} value={titular} onChangeText={setTitular} placeholderTextColor={colors.textMuted} />
      <Label texto="Monto de suscripción (S/ / mes)" />
      <TextInput style={styles.input} value={monto} onChangeText={setMonto} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

      <View style={styles.qrRow}>
        <View style={styles.qrCol}>
          <Label texto="QR Yape" />
          <QrPicker uri={yapeQrUrl} subiendo={subiendo === 'yape'} onPress={() => subirQr('yape')} />
        </View>
        <View style={styles.qrCol}>
          <Label texto="QR Plin" />
          <QrPicker uri={plinQrUrl} subiendo={subiendo === 'plin'} onPress={() => subirQr('plin')} />
        </View>
      </View>

      <Pressable style={styles.boton} onPress={guardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.botonTexto}>Guardar configuración</Text>}
      </Pressable>
    </Section>
  );
}

function Label({ texto }: { texto: string }) {
  return <Text style={styles.label}>{texto}</Text>;
}

function QrPicker({ uri, subiendo, onPress }: { uri: string | null; subiendo: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.qrPicker} onPress={onPress} disabled={subiendo}>
      {subiendo ? (
        <ActivityIndicator color={colors.primary} />
      ) : uri ? (
        <Image source={{ uri }} style={styles.qrImg} resizeMode="contain" />
      ) : (
        <Text style={styles.qrPlaceholder}>Subir QR</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, flexGrow: 1 },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 13, marginTop: -8 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  seccionTitulo: { color: colors.text, fontSize: 15, fontWeight: '800' },
  texto: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 4 },
  botonTexto: { color: colors.text, fontWeight: '700' },
  enlaceRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  enlaceTexto: { flex: 1, color: colors.accent, fontSize: 12 },
  copiarBtn: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  copiarBtnTexto: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  vacio: { color: colors.textMuted, fontStyle: 'italic', fontSize: 13 },
  pagoCard: { backgroundColor: colors.cardAlt, borderRadius: radius.sm, padding: 12, gap: 2, marginTop: 8 },
  nombre: { color: colors.text, fontSize: 15, fontWeight: '700' },
  negocio: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  dato: { color: colors.textMuted, fontSize: 12 },
  fecha: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  comprobante: { width: '100%', height: 160, borderRadius: radius.sm, backgroundColor: colors.card, marginTop: 6 },
  accionesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  aprobarBtn: { flex: 1, backgroundColor: colors.success, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  aprobarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rechazarBtn: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  rechazarBtnSolidTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rechazarBtnOutline: { flex: 1, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  rechazarBtnTexto: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  cancelarBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  cancelarBtnTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    fontSize: 14,
    marginTop: 4,
    backgroundColor: colors.cardAlt,
  },
  qrRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  qrCol: { flex: 1 },
  qrPicker: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  qrImg: { width: '100%', height: '100%' },
  qrPlaceholder: { color: colors.accent, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  signOut: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  signOutTexto: { color: colors.danger, fontWeight: '700' },
});
