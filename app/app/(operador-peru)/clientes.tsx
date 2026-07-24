import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { generarYCompartirPdf } from '../../lib/pdfReporte';
import { Usuario } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

export default function ClientesRegistrados() {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      setCargando(true);
      supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'cliente')
        .eq('negocio_operador_peru_id', usuario.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setClientes((data as Usuario[] | null) ?? []);
          setCargando(false);
        });
    }, [usuario])
  );

  const exportarPdf = async () => {
    setGenerandoPdf(true);
    try {
      const filas = clientes
        .map(
          (c) => `<tr>
            <td>${c.nombre}</td>
            <td>${c.email ?? '—'}</td>
            <td>${c.telefono ?? '—'}</td>
            <td>${c.pais ?? '—'}</td>
            <td>${new Date(c.created_at).toLocaleDateString('es-PE')}</td>
          </tr>`
        )
        .join('');

      await generarYCompartirPdf(
        'Clientes registrados',
        `${clientes.length} clientes`,
        `<table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>País</th><th>Registrado</th></tr></thead>
          <tbody>${filas || '<tr><td colspan="5">Sin clientes registrados.</td></tr>'}</tbody>
        </table>`
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      data={clientes}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.titulo}>Clientes registrados ({clientes.length})</Text>
          <Pressable style={styles.pdfBtn} onPress={exportarPdf} disabled={generandoPdf || clientes.length === 0}>
            {generandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>PDF</Text>}
          </Pressable>
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.nombre}>{item.nombre}</Text>
          <Text style={styles.dato}>{item.email}</Text>
          <Text style={styles.dato}>{item.telefono ?? 'Sin teléfono'} · {item.pais ?? 'Sin país'}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800' },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  pdfBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 2 },
  nombre: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 12 },
});
