import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { SolicitudCard } from '../../components/SolicitudCard';
import { Solicitud } from '../../types/database';
import { colors } from '../../constants/theme';

/** F12 — Historial del cliente con opción de repetir remesa con los mismos datos del beneficiario. */
export default function Historial() {
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      supabase
        .from('solicitudes')
        .select('*')
        .eq('cliente_id', usuario.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setSolicitudes((data as Solicitud[]) ?? []));
    }, [usuario])
  );

  const repetir = (s: Solicitud) =>
    router.push({
      pathname: '/(cliente)/nueva-solicitud',
      params: { monto: String(s.monto_pen), tasaId: '' },
    });

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      data={solicitudes}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>Aún no tienes remesas enviadas.</Text>}
      renderItem={({ item }) => (
        <View style={{ gap: 8 }}>
          <SolicitudCard
            solicitud={item}
            onPress={() => router.push({ pathname: '/(cliente)/solicitud/[id]', params: { id: item.id } })}
          />
          <Pressable style={styles.repetirButton} onPress={() => repetir(item)}>
            <Text style={styles.repetirText}>Repetir remesa</Text>
          </Pressable>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  repetirButton: { alignSelf: 'flex-start', paddingHorizontal: 4 },
  repetirText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
