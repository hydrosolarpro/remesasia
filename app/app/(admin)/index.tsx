import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { RoleTag } from '../../components/RoleTag';
import { colors, radius, cardShadow } from '../../constants/theme';

interface OperadorPeru {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  created_at: string;
  perfil_negocio: { nombre_negocio: string } | null;
}

// Único panel del administrador: lista de todos los Operadores Perú
// registrados con sus datos de contacto. Nada más — sin acciones sobre
// ellos, solo visibilidad.
export default function PanelAdmin() {
  const { usuario, signOut } = useAuth();
  const [operadores, setOperadores] = useState<OperadorPeru[]>([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      supabase
        .from('usuarios')
        .select('id, nombre, email, telefono, created_at, perfil_negocio(nombre_negocio)')
        .eq('rol', 'operador_peru')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setOperadores((data as unknown as OperadorPeru[] | null) ?? []);
          setCargando(false);
        });
    }, [])
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      data={operadores}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <RoleTag rol="administrador" />
          <Text style={styles.titulo}>Operadores Perú registrados ({operadores.length})</Text>
          <Text style={styles.subtitulo}>{usuario?.email}</Text>
        </View>
      }
      ListEmptyComponent={!cargando ? <Text style={styles.vacio}>Todavía no hay ningún Operador Perú registrado.</Text> : null}
      ListFooterComponent={
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutTexto}>Cerrar sesión</Text>
        </Pressable>
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          {item.perfil_negocio?.nombre_negocio ? <Text style={styles.negocio}>{item.perfil_negocio.nombre_negocio}</Text> : null}
          <Text style={styles.dato}>{item.email ?? 'Sin correo'}</Text>
          <Text style={styles.dato}>{item.telefono ?? 'Sin teléfono'}</Text>
          <Text style={styles.fecha}>Registrado el {new Date(item.created_at).toLocaleDateString('es-PE')}</Text>
        </View>
      )}
      ListFooterComponentStyle={{ marginTop: 20 }}
      refreshing={cargando}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1 },
  header: { gap: 8, marginBottom: 16 },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 13, marginTop: -6 },
  vacio: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 2 },
  nombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  negocio: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  dato: { color: colors.textMuted, fontSize: 13 },
  fecha: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  signOut: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  signOutTexto: { color: colors.danger, fontWeight: '700' },
});
