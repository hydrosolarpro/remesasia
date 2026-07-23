import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SolicitudCard } from '../../components/SolicitudCard';
import { EstadoSolicitud, Solicitud } from '../../types/database';
import { colors } from '../../constants/theme';

const FILTROS: { label: string; estados: EstadoSolicitud[] }[] = [
  { label: 'Por revisar', estados: ['EN_VERIFICACION'] },
  { label: 'Pendientes', estados: ['PENDIENTE'] },
  { label: 'En proceso', estados: ['FONDOS_VERIFICADOS', 'EN_PROCESO'] },
  { label: 'Completadas', estados: ['COMPLETADA'] },
  { label: 'Todas', estados: [] },
];

/** F6 — Panel de gestión de solicitudes del Operador Perú: filtros por estado + acceso a verificación. */
export default function SolicitudesOperadorPeru() {
  const [filtro, setFiltro] = useState(0);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  useFocusEffect(
    useCallback(() => {
      const estados = FILTROS[filtro].estados;
      let query = supabase.from('solicitudes').select('*').order('created_at', { ascending: false });
      if (estados.length) query = query.in('estado', estados);
      query.then(({ data }) => setSolicitudes((data as Solicitud[]) ?? []));
    }, [filtro])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros} contentContainerStyle={{ gap: 8 }}>
        {FILTROS.map((f, i) => (
          <Pressable key={f.label} style={[styles.chip, filtro === i && styles.chipActive]} onPress={() => setFiltro(i)}>
            <Text style={[styles.chipText, filtro === i && styles.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        contentContainerStyle={styles.list}
        data={solicitudes}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No hay solicitudes en este filtro.</Text>}
        renderItem={({ item }) => (
          <SolicitudCard
            solicitud={item}
            onPress={() => router.push({ pathname: '/(operador-peru)/solicitud/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: { flexGrow: 0, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.text },
  list: { padding: 16, flexGrow: 1 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
