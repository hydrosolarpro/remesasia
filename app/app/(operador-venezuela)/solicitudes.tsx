import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SolicitudCard } from '../../components/SolicitudCard';
import { Solicitud } from '../../types/database';
import { colors } from '../../constants/theme';

/** F7 — Panel Operador Venezuela: solicitudes con fondos verificados o en proceso, listas para transferir. */
export default function SolicitudesOperadorVenezuela() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('solicitudes')
        .select('*')
        .in('estado', ['EN_PROCESO', 'COMPLETADA'])
        .order('created_at', { ascending: false })
        .then(({ data }) => setSolicitudes((data as Solicitud[]) ?? []));
    }, [])
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={solicitudes}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No hay solicitudes por transferir.</Text>}
      renderItem={({ item }) => (
        <SolicitudCard
          solicitud={item}
          onPress={() => router.push({ pathname: '/(operador-venezuela)/solicitud/[id]', params: { id: item.id } })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
