import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { crearInvitacion, construirEnlaceInvitacion } from '../../lib/invitaciones';
import { construirEnlaceWhatsAppGenerico } from '../../lib/whatsapp';
import { KPICard } from '../../components/KPICard';
import { Prospecto, EstadoLead } from '../../types/database';
import { colors, radius, cardShadow, estadoLeadColor, estadoLeadLabel } from '../../constants/theme';

const ESTADOS: (EstadoLead | 'todos')[] = ['todos', 'nuevo', 'contactado', 'demo_enviado', 'convertido', 'descartado'];

const LABEL_OPERA: Record<string, string> = {
  ya_opero: 'Ya opera un negocio de remesas',
  quiero_empezar: 'Quiere empezar uno',
  solo_investigando: 'Solo está investigando',
};
const LABEL_VOLUMEN: Record<string, string> = {
  menos_20: '< 20 clientes/mes',
  '20_100': '20–100 clientes/mes',
  '100_300': '100–300 clientes/mes',
  mas_300: '+300 clientes/mes',
};
const LABEL_EQUIPO: Record<string, string> = {
  con_equipo: 'Tiene equipo PE/VE',
  solo: 'Trabaja solo',
  sin_equipo: 'Sin equipo aún',
};
const LABEL_URGENCIA: Record<string, string> = {
  esta_semana: 'Quiere empezar esta semana',
  este_mes: 'Este mes',
  explorando: 'Solo explorando',
};
const LABEL_PAIS: Record<string, string> = { peru: '🇵🇪 Perú', venezuela: '🇻🇪 Venezuela', ambos: '🇵🇪🇻🇪 Ambos' };

const formatearFecha = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const esDeHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export default function CrmProspectos() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoLead | 'todos'>('todos');
  const [filtroCalificado, setFiltroCalificado] = useState<'todos' | 'si' | 'no'>('todos');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [notasBorrador, setNotasBorrador] = useState<Record<string, string>>({});
  const [expandido, setExpandido] = useState<string | null>(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    const { data, error } = await supabase.from('prospectos').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error cargando prospectos:', error.message);
    setProspectos((data as Prospecto[] | null) ?? []);
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  useEffect(() => {
    const id = setInterval(() => cargar(true), 5_000);
    return () => clearInterval(id);
  }, [cargar]);

  const total = prospectos.length;
  const calificados = prospectos.filter((p) => p.calificado).length;
  const tasaCalificacion = total > 0 ? `${Math.round((calificados / total) * 100)}%` : '—';
  const nuevosHoy = prospectos.filter((p) => esDeHoy(p.created_at)).length;

  const filtrados = prospectos.filter((p) => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (filtroCalificado === 'si' && !p.calificado) return false;
    if (filtroCalificado === 'no' && p.calificado) return false;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      if (!p.nombre.toLowerCase().includes(q) && !p.telefono.includes(q) && !p.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const cambiarEstado = async (p: Prospecto, estado: EstadoLead) => {
    setProcesando(p.id);
    const { error } = await supabase.from('prospectos').update({ estado, updated_at: new Date().toISOString() }).eq('id', p.id);
    setProcesando(null);
    if (error) return Alert.alert('Error', error.message);
    cargar();
  };

  const guardarNotas = async (p: Prospecto) => {
    const notas = notasBorrador[p.id] ?? p.notas ?? '';
    setProcesando(p.id);
    const { error } = await supabase.from('prospectos').update({ notas, updated_at: new Date().toISOString() }).eq('id', p.id);
    setProcesando(null);
    if (error) return Alert.alert('Error', error.message);
    cargar();
  };

  const generarYEnviarInvitacion = async (p: Prospecto) => {
    setProcesando(p.id);
    try {
      const inv = await crearInvitacion('operador_peru');
      const enlace = construirEnlaceInvitacion(inv.token);
      const mensaje = `Hola ${p.nombre}! Te invito al aplicativo inteligente y automático remesas Perú Venezuela. Accede a la versión DEMO gratis por 7 días. Debes usar un correo electrónico verificable Gmail, junto con tu contraseña. Accede y descubre todos los beneficios que este aplicativo puede darte para el crecimiento y la eficiencia de tu negocio de remesas. Accede aquí: ${enlace}`;
      const enlaceWa = construirEnlaceWhatsAppGenerico(p.telefono, mensaje);
      if (!enlaceWa) {
        Alert.alert('Teléfono inválido', 'No se pudo armar el enlace de WhatsApp con el teléfono de este prospecto.');
        return;
      }
      await supabase.from('prospectos').update({ estado: 'demo_enviado', updated_at: new Date().toISOString() }).eq('id', p.id);
      Linking.openURL(enlaceWa);
      cargar();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo generar la invitación.');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>CRM de Prospectos</Text>
      <Text style={styles.subtitulo}>Leads captados por el cuestionario filtro de la landing de ventas.</Text>

      <View style={styles.kpiRow}>
        <KPICard label="Total prospectos" value={String(total)} />
        <KPICard label="Calificados" value={String(calificados)} />
        <KPICard label="Tasa de calificación" value={tasaCalificacion} />
        <KPICard label="Nuevos hoy" value={String(nuevosHoy)} />
      </View>

      <TextInput
        style={styles.input}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por nombre, teléfono o email..."
        placeholderTextColor={colors.textMuted}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {ESTADOS.map((e) => (
          <Pressable key={e} style={[styles.chip, filtroEstado === e && styles.chipActivo]} onPress={() => setFiltroEstado(e)}>
            <Text style={[styles.chipTexto, filtroEstado === e && styles.chipTextoActivo]}>
              {e === 'todos' ? 'Todos los estados' : estadoLeadLabel[e]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.chipsRow}>
        {(['todos', 'si', 'no'] as const).map((c) => (
          <Pressable key={c} style={[styles.chip, filtroCalificado === c && styles.chipActivo]} onPress={() => setFiltroCalificado(c)}>
            <Text style={[styles.chipTexto, filtroCalificado === c && styles.chipTextoActivo]}>
              {c === 'todos' ? 'Calificados y no' : c === 'si' ? 'Solo calificados' : 'No calificados'}
            </Text>
          </Pressable>
        ))}
      </View>

      {cargando && <ActivityIndicator color={colors.primary} />}
      {!cargando && filtrados.length === 0 && <Text style={styles.vacio}>No hay prospectos que coincidan con este filtro.</Text>}

      {filtrados.map((p) => {
        const abierto = expandido === p.id;
        const colorEstado = estadoLeadColor[p.estado] ?? colors.textMuted;
        const yaEnviado = p.estado === 'demo_enviado' || p.estado === 'convertido';
        return (
          <Pressable key={p.id} style={[styles.card, cardShadow]} onPress={() => setExpandido(abierto ? null : p.id)}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{p.nombre}</Text>
                <Text style={styles.dato}>
                  {p.telefono} · {p.email}
                </Text>
              </View>
              <View style={styles.badges}>
                <View style={[styles.badge, { borderColor: colorEstado, backgroundColor: `${colorEstado}1F` }]}>
                  <View style={[styles.dot, { backgroundColor: colorEstado }]} />
                  <Text style={[styles.badgeTexto, { color: colorEstado }]}>{estadoLeadLabel[p.estado]}</Text>
                </View>
                <Text style={[styles.puntaje, p.calificado ? styles.puntajeCalificado : styles.puntajeNoCalificado]}>
                  {p.calificado ? '✓' : '—'} {p.puntaje} pts
                </Text>
              </View>
            </View>
            <Text style={styles.fecha}>
              {LABEL_PAIS[p.pais] ?? p.pais} · {formatearFecha(p.created_at)}
            </Text>

            {abierto && (
              <View style={styles.detalle}>
                <Text style={styles.respuesta}>• {LABEL_OPERA[p.opera_actualmente] ?? p.opera_actualmente}</Text>
                <Text style={styles.respuesta}>• {LABEL_VOLUMEN[p.volumen_mensual] ?? p.volumen_mensual}</Text>
                <Text style={styles.respuesta}>• {LABEL_EQUIPO[p.tiene_equipo] ?? p.tiene_equipo}</Text>
                <Text style={styles.respuesta}>• {LABEL_URGENCIA[p.urgencia] ?? p.urgencia}</Text>

                <Text style={styles.label}>Cambiar estado</Text>
                <View style={styles.chipsRow}>
                  {(['nuevo', 'contactado', 'demo_enviado', 'convertido', 'descartado'] as EstadoLead[]).map((e) => (
                    <Pressable
                      key={e}
                      style={[styles.chipSmall, p.estado === e && styles.chipActivo]}
                      onPress={() => cambiarEstado(p, e)}
                      disabled={procesando === p.id}
                    >
                      <Text style={[styles.chipTexto, p.estado === e && styles.chipTextoActivo]}>{estadoLeadLabel[e]}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Notas</Text>
                <TextInput
                  style={[styles.input, styles.notasInput]}
                  value={notasBorrador[p.id] ?? p.notas ?? ''}
                  onChangeText={(v) => setNotasBorrador((prev) => ({ ...prev, [p.id]: v }))}
                  placeholder="Notas del seguimiento con este prospecto..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
                <Pressable style={styles.guardarNotasBtn} onPress={() => guardarNotas(p)} disabled={procesando === p.id}>
                  <Text style={styles.guardarNotasBtnTexto}>Guardar notas</Text>
                </Pressable>

                <Pressable
                  style={[styles.invitarBtn, yaEnviado && styles.invitarBtnHecho]}
                  onPress={() => generarYEnviarInvitacion(p)}
                  disabled={procesando === p.id}
                >
                  {procesando === p.id ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={styles.invitarBtnTexto}>
                      {yaEnviado ? '↻ Reenviar invitación DEMO' : '📲 Generar y enviar invitación DEMO'}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, flexGrow: 1 },
  titulo: { color: colors.text, fontSize: 23, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 15, marginTop: -6 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.cardAlt,
  },
  chipsScroll: { flexGrow: 0 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipSmall: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextoActivo: { color: colors.text },
  vacio: { color: colors.textMuted, fontStyle: 'italic', fontSize: 15 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nombre: { color: colors.text, fontSize: 17, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 14 },
  fecha: { color: colors.textMuted, fontSize: 13 },
  badges: { alignItems: 'flex-end', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeTexto: { fontSize: 13, fontWeight: '700' },
  puntaje: { fontSize: 13, fontWeight: '800' },
  puntajeCalificado: { color: colors.success },
  puntajeNoCalificado: { color: colors.textMuted },
  detalle: { marginTop: 8, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  respuesta: { color: colors.text, fontSize: 14 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 6 },
  notasInput: { minHeight: 70, textAlignVertical: 'top' },
  guardarNotasBtn: { alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  guardarNotasBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  invitarBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 4 },
  invitarBtnHecho: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  invitarBtnTexto: { color: colors.text, fontWeight: '700' },
});
