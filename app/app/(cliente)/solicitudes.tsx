import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ClienteSolicitudRow } from '../../components/ClientSolicitudRow';
import { hoyLocal, fechaLocalDe, yaCerroHoy } from '../../lib/fechaLocal';
import { Solicitud } from '../../types/database';
import { colors } from '../../constants/theme';

export default function SolicitudesCliente() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [horarioFin, setHorarioFin] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<{ id: string; tipo: 'confirmar' | 'reportar' | 'resolver' } | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    const { data } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('cliente_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setSolicitudes((data as Solicitud[] | null) ?? []);
    setCargando(false);
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // El corte de "realizadas hoy" es a la hora de cierre del horario de
  // atención del negocio (perfil_negocio.horario_fin), no a medianoche.
  useEffect(() => {
    if (!usuario?.negocio_operador_peru_id) return;
    supabase
      .from('perfil_negocio')
      .select('horario_fin')
      .eq('operador_peru_id', usuario.negocio_operador_peru_id)
      .maybeSingle()
      .then(({ data }) => setHorarioFin(data?.horario_fin || null));
  }, [usuario?.negocio_operador_peru_id]);

  // Tick periódico para que la lista se vacíe sola en cuanto se cruza la
  // hora de cierre, sin necesidad de recargar la pantalla.
  const [tickHorario, setTickHorario] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTickHorario((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const enCurso = useMemo(() => solicitudes.filter((s) => !s.check_deposito_ve), [solicitudes]);
  // Solo las completadas HOY y antes de la hora de cierre: pasada esa
  // hora (o al cambiar de día calendario si no hay horario configurado),
  // desaparecen de esta lista pero no de la base de datos — siguen
  // disponibles para buscarlas con los filtros de Estadísticas. Mismo
  // criterio que ya usa PeruDashboardView.tsx para operador Perú/Venezuela.
  const realizadas = useMemo(() => {
    if (yaCerroHoy(horarioFin)) return [];
    return solicitudes.filter((s) => s.check_deposito_ve && s.check_deposito_ve_at && fechaLocalDe(s.check_deposito_ve_at) === hoyLocal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudes, horarioFin, tickHorario]);

  // Numeración única y continua sobre TODAS las solicitudes (en curso +
  // realizadas), por orden de envío — así una solicitud conserva su
  // número al completarse, sin importar el orden en que se validen.
  const numeracion = useMemo(() => {
    const ordenadas = [...solicitudes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const mapa = new Map<string, number>();
    ordenadas.forEach((s, i) => mapa.set(s.id, i + 1));
    return mapa;
  }, [solicitudes]);

  const confirmarBeneficiario = async (s: Solicitud) => {
    setEnviando({ id: s.id, tipo: 'confirmar' });
    await supabase.rpc('confirmar_beneficiario_recibido', { p_solicitud_id: s.id });
    setEnviando(null);
    cargar();
  };

  const reportarNoLlego = async (s: Solicitud) => {
    setEnviando({ id: s.id, tipo: 'reportar' });
    await supabase.rpc('reportar_beneficiario_no_recibido', { p_solicitud_id: s.id });
    setEnviando(null);
    cargar();
  };

  // El cliente ya verificó en cuenta tras reportar "no llegó" y confirma
  // que sí llegó -- reutiliza el mismo RPC que usan los operadores para
  // resolver "Operaciones por revisar" (ver 0045_cliente_autorresuelve_revision.sql).
  const confirmarResuelto = async (s: Solicitud) => {
    setEnviando({ id: s.id, tipo: 'resolver' });
    await supabase.rpc('resolver_revision_beneficiario', { p_solicitud_id: s.id });
    setEnviando(null);
    cargar();
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.seccionTitulo}>Solicitudes en curso ({enCurso.length})</Text>
      {enCurso.length === 0 && <Text style={styles.vacio}>No tienes solicitudes en curso.</Text>}
      <View style={styles.lista}>
        {enCurso.map((s) => (
          <ClienteSolicitudRow
            key={s.id}
            solicitud={s}
            numero={numeracion.get(s.id)}
            onConfirmar={() => confirmarBeneficiario(s)}
            onReportar={() => reportarNoLlego(s)}
            onConfirmarResuelto={() => confirmarResuelto(s)}
            confirmando={enviando?.id === s.id && enviando.tipo === 'confirmar'}
            reportando={enviando?.id === s.id && enviando.tipo === 'reportar'}
            confirmandoResuelto={enviando?.id === s.id && enviando.tipo === 'resolver'}
          />
        ))}
      </View>

      <Text style={styles.seccionTitulo}>Solicitudes realizadas hoy ({realizadas.length})</Text>
      {realizadas.length === 0 && <Text style={styles.vacio}>Todavía no tienes solicitudes completadas hoy.</Text>}
      <View style={styles.lista}>
        {realizadas.map((s) => (
          <ClienteSolicitudRow
            key={s.id}
            solicitud={s}
            numero={numeracion.get(s.id)}
            onConfirmar={() => confirmarBeneficiario(s)}
            onReportar={() => reportarNoLlego(s)}
            onConfirmarResuelto={() => confirmarResuelto(s)}
            confirmando={enviando?.id === s.id && enviando.tipo === 'confirmar'}
            reportando={enviando?.id === s.id && enviando.tipo === 'reportar'}
            confirmandoResuelto={enviando?.id === s.id && enviando.tipo === 'resolver'}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 10, paddingBottom: 48 },
  seccionTitulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8, textTransform: 'uppercase' },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  lista: { gap: 10 },
});
