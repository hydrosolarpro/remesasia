import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ClienteSolicitudRow } from '../../components/ClientSolicitudRow';
import { Solicitud } from '../../types/database';
import { colors } from '../../constants/theme';

export default function SolicitudesCliente() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

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

  const enCurso = useMemo(() => solicitudes.filter((s) => !s.check_deposito_ve), [solicitudes]);
  const realizadas = useMemo(() => solicitudes.filter((s) => s.check_deposito_ve), [solicitudes]);

  // Numeración única y continua sobre TODAS las solicitudes (en curso +
  // realizadas), por orden de envío — así una solicitud conserva su
  // número al completarse, sin importar el orden en que se validen.
  const numeracion = useMemo(() => {
    const ordenadas = [...solicitudes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const mapa = new Map<string, number>();
    ordenadas.forEach((s, i) => mapa.set(s.id, i + 1));
    return mapa;
  }, [solicitudes]);

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
          <ClienteSolicitudRow key={s.id} solicitud={s} numero={numeracion.get(s.id)} />
        ))}
      </View>

      <Text style={styles.seccionTitulo}>Solicitudes realizadas ({realizadas.length})</Text>
      {realizadas.length === 0 && <Text style={styles.vacio}>Todavía no tienes solicitudes completadas.</Text>}
      <View style={styles.lista}>
        {realizadas.map((s) => (
          <ClienteSolicitudRow key={s.id} solicitud={s} numero={numeracion.get(s.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 10, paddingBottom: 48 },
  seccionTitulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  lista: { gap: 10 },
});
