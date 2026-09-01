import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert, Linking } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { construirEnlaceLandingOperador } from '../../lib/invitaciones';
import { construirEnlaceWhatsAppSinDestino } from '../../lib/whatsapp';
import { planDesdeMonto } from '../../lib/plan';
import { RoleTag } from '../../components/RoleTag';
import { ZoomableImageModal } from '../../components/ZoomableImageModal';
import { PinAccesoCard } from '../../components/PinAccesoCard';
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
  // Enlace fijo (sin token) a la landing de captación de operadores: quien
  // lo abre completa ahí el cuestionario de DEMO y ella misma le arma el
  // acceso -- ya no se genera una invitación directa por adelantado (ver
  // construirEnlaceLandingOperador).
  const [enlaceInvitacion] = useState<string>(construirEnlaceLandingOperador());
  const [copiado, setCopiado] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [zoomUri, setZoomUri] = useState<string | null>(null);

  // `silencioso`: evita el parpadeo a pantalla de carga en los refrescos
  // automáticos de fondo (polling de 8s más abajo) -- solo se usa el
  // spinner en la carga inicial.
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
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
        // Excluye las solicitudes de UNLIMITED que todavía no tienen un pago
        // real que verificar: recién consultadas (monto_por_definir, ver
        // FormularioSolicitudPlan) o con el monto ya fijado por el admin
        // pero sin comprobante subido todavía (ver panel-control.tsx). Acá
        // solo deben aparecer pagos con comprobante listos para Aprobar/Rechazar.
        .eq('monto_por_definir', false)
        .not('comprobante_url', 'is', null)
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

  // Auto-actualización cada 5s: nuevos pagos por verificar u operadores
  // registrados aparecen solos, sin recargar la pantalla.
  useEffect(() => {
    const id = setInterval(() => cargar(true), 5_000);
    return () => clearInterval(id);
  }, [cargar]);

  const invitarOperador = () => {
    const mensaje = `Te invito al aplicativo inteligente y automático remesas Perú Venezuela. Completa el formulario y accede a la versión DEMO gratis por 7 días. Accede aquí: ${enlaceInvitacion}`;
    Linking.openURL(construirEnlaceWhatsAppSinDestino(mensaje));
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
    if (error) {
      setProcesandoPago(null);
      Alert.alert('Error', error.message);
      return;
    }
    // Al aprobar, el operador pasa automáticamente de DEMO al plan que
    // corresponda según el monto pagado (y se le concede el acceso en el
    // mismo paso, para no dejarlo viendo "en revisión" después de haber
    // tenido acceso libre durante el DEMO). plan_inicio ancla el ciclo de
    // 30 días de este plan recién activado.
    if (estado === 'verificado') {
      const plan = planDesdeMonto(pago.monto);
      const { error: errorPlan } = await supabase
        .from('usuarios')
        .update({ plan, acceso_concedido: true, plan_inicio: new Date().toISOString() })
        .eq('id', pago.operador_peru_id);
      if (errorPlan) {
        setProcesandoPago(null);
        Alert.alert(`Pago verificado, pero no se pudo activar el plan ${plan.toUpperCase()}`, errorPlan.message);
        cargar();
        return;
      }
    }
    setProcesandoPago(null);
    cargar();
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol="administrador" />
      <Text style={styles.titulo}>Bienvenido a Remesas Perú-Venezuela, {usuario?.nombre}</Text>
      <Text style={styles.subtitulo}>{usuario?.email}</Text>

      <Pressable style={styles.panelControlBtn} onPress={() => router.push('/(admin)/panel-control')}>
        <Text style={styles.panelControlBtnTexto}>Panel de control →</Text>
      </Pressable>

      <Pressable style={styles.panelControlBtn} onPress={() => router.push('/(admin)/crm-prospectos')}>
        <Text style={styles.panelControlBtnTexto}>CRM de prospectos →</Text>
      </Pressable>

      <Section titulo="Invitar Operador Perú">
        <Text style={styles.texto}>
          Comparte este enlace a la landing de captación. Ahí completa el formulario del DEMO y, apenas termina,
          entra directo como Operador Perú con Google -- ya no hace falta generar una invitación aparte.
        </Text>
        <Pressable style={styles.boton} onPress={invitarOperador}>
          <Text style={styles.botonTexto}>💬 Compartir por WhatsApp</Text>
        </Pressable>
        <View style={styles.enlaceRow}>
          <Text style={styles.enlaceTexto} numberOfLines={1}>
            {enlaceInvitacion}
          </Text>
          <Pressable style={styles.copiarBtn} onPress={copiarEnlace}>
            <Text style={styles.copiarBtnTexto}>{copiado ? '✓ Copiado' : 'Copiar'}</Text>
          </Pressable>
        </View>
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
            {pago.comprobante_url && (
              <Pressable onPress={() => setZoomUri(pago.comprobante_url)}>
                <Image source={{ uri: pago.comprobante_url }} style={styles.comprobante} resizeMode="contain" />
                <Text style={styles.verCompletoTexto}>🔍 Toca para verla completa y hacer zoom</Text>
              </Pressable>
            )}

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

      <PinAccesoCard />

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutTexto}>Cerrar sesión</Text>
      </Pressable>
      <ZoomableImageModal visible={!!zoomUri} uri={zoomUri} onClose={() => setZoomUri(null)} />
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
  const [yapeTelefono, setYapeTelefono] = useState(config?.yape_telefono ?? '');
  const [plinTelefono, setPlinTelefono] = useState(config?.plin_telefono ?? '');
  const [otroMedioNombre, setOtroMedioNombre] = useState(config?.otro_medio_nombre ?? '');
  const [otroMedioTelefono, setOtroMedioTelefono] = useState(config?.otro_medio_telefono ?? '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const payload = {
      banco: banco.trim(),
      cuenta_soles: cuenta.trim(),
      cci: cci.trim(),
      titular: titular.trim(),
      yape_telefono: yapeTelefono.trim() || null,
      plin_telefono: plinTelefono.trim() || null,
      otro_medio_nombre: otroMedioNombre.trim() || null,
      otro_medio_telefono: otroMedioTelefono.trim() || null,
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

      <Label texto="Teléfono Yape" />
      <TextInput style={styles.input} value={yapeTelefono} onChangeText={setYapeTelefono} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />
      <Label texto="Teléfono Plin" />
      <TextInput style={styles.input} value={plinTelefono} onChangeText={setPlinTelefono} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />

      <Label texto="Otro medio de pago (opcional)" />
      <View style={styles.otroMedioRow}>
        <TextInput
          style={[styles.input, styles.otroMedioNombre]}
          value={otroMedioNombre}
          onChangeText={setOtroMedioNombre}
          placeholder="Nombre (Ej. Tunki, Agora...)"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={[styles.input, styles.otroMedioTelefono]}
          value={otroMedioTelefono}
          onChangeText={setOtroMedioTelefono}
          keyboardType="phone-pad"
          placeholder="Teléfono"
          placeholderTextColor={colors.textMuted}
        />
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

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, flexGrow: 1 },
  titulo: { color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 15, marginTop: -8 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  seccionTitulo: { color: colors.text, fontSize: 17, fontWeight: '800' },
  texto: { color: colors.textMuted, fontSize: 15, lineHeight: 18 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 4 },
  panelControlBtn: { backgroundColor: colors.cardAlt, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  panelControlBtnTexto: { color: colors.accent, fontWeight: '800', fontSize: 17 },
  botonTexto: { color: colors.text, fontWeight: '700' },
  enlaceRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  enlaceTexto: { flex: 1, color: colors.accent, fontSize: 14 },
  copiarBtn: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  copiarBtnTexto: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  vacio: { color: colors.textMuted, fontStyle: 'italic', fontSize: 15 },
  pagoCard: { backgroundColor: colors.cardAlt, borderRadius: radius.sm, padding: 12, gap: 2, marginTop: 8 },
  nombre: { color: colors.text, fontSize: 17, fontWeight: '700' },
  negocio: { color: colors.accent, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  dato: { color: colors.textMuted, fontSize: 14 },
  fecha: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  comprobante: { width: '100%', height: 160, borderRadius: radius.sm, backgroundColor: colors.card, marginTop: 6 },
  verCompletoTexto: { color: colors.accent, fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 4 },
  accionesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  aprobarBtn: { flex: 1, backgroundColor: colors.success, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  aprobarBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rechazarBtn: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  rechazarBtnSolidTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rechazarBtnOutline: { flex: 1, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  rechazarBtnTexto: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  cancelarBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  cancelarBtnTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    fontSize: 16,
    marginTop: 4,
    backgroundColor: colors.cardAlt,
  },
  otroMedioRow: { flexDirection: 'row', gap: 8 },
  otroMedioNombre: { flex: 1, minWidth: 0, marginTop: 0 },
  otroMedioTelefono: { flex: 1, minWidth: 0, marginTop: 0 },
  signOut: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  signOutTexto: { color: colors.danger, fontWeight: '700' },
});
