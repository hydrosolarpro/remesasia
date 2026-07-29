import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { generarYCompartirPdf } from '../../lib/pdfReporte';
import { generarYCompartirExcel } from '../../lib/excelReporte';
import { obtenerOCrearInvitacionCliente, construirEnlaceInvitacion } from '../../lib/invitaciones';
import { LIMITE_CLIENTES } from '../../lib/plan';
import { Usuario } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

export default function ClientesRegistrados() {
  const { usuario } = useAuth();
  // Para un miembro de equipo el negocio es el del dueño que lo agregó,
  // no el suyo propio (mismo criterio que (operador-peru)/index.tsx).
  const [negocioId, setNegocioId] = useState<string | null | undefined>(undefined);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [enlaceCliente, setEnlaceCliente] = useState<string | null>(null);
  const [cargandoEnlace, setCargandoEnlace] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === 'operador_peru') {
      setNegocioId(usuario.id);
      return;
    }
    supabase
      .from('operador_peru_miembro')
      .select('operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => setNegocioId(data?.operador_peru_id ?? null));
  }, [usuario]);

  const cargarClientes = useCallback(() => {
    if (!negocioId) return;
    setCargandoClientes(true);
    supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'cliente')
      .eq('negocio_operador_peru_id', negocioId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setClientes((data as Usuario[] | null) ?? []);
        setCargandoClientes(false);
      });
  }, [negocioId]);

  useFocusEffect(
    useCallback(() => {
      cargarClientes();
    }, [cargarClientes])
  );

  // Elimina la fila de `usuarios` y la cuenta de acceso del cliente (ver
  // supabase/functions/eliminar-cliente). La propia función rechaza el
  // borrado si el cliente ya tiene solicitudes registradas, para no perder
  // historial financiero -- acá solo se muestra ese mensaje si ocurre.
  const eliminarCliente = (item: Usuario) => {
    const confirmarYBorrar = async () => {
      setEliminandoId(item.id);
      const { data, error } = await supabase.functions.invoke('eliminar-cliente', { body: { cliente_id: item.id } });
      setEliminandoId(null);
      const mensajeError = error ? (data as { error?: string } | null)?.error || error.message : null;
      if (mensajeError) {
        if (Platform.OS === 'web') window.alert(mensajeError);
        else Alert.alert('No se pudo eliminar', mensajeError);
        return;
      }
      cargarClientes();
    };

    const mensaje = `¿Eliminar a ${item.nombre} de tus clientes? Solo se puede eliminar si no tiene solicitudes registradas. Esta acción no se puede deshacer.`;
    if (Platform.OS === 'web') {
      if (window.confirm(mensaje)) confirmarYBorrar();
      return;
    }
    Alert.alert('Eliminar cliente', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: confirmarYBorrar },
    ]);
  };

  useEffect(() => {
    if (!negocioId) return;
    setCargandoEnlace(true);
    obtenerOCrearInvitacionCliente(negocioId)
      .then((inv) => setEnlaceCliente(construirEnlaceInvitacion(inv.token)))
      .finally(() => setCargandoEnlace(false));
  }, [negocioId]);

  const copiarEnlace = async () => {
    if (!enlaceCliente) return;
    await Clipboard.setStringAsync(enlaceCliente);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  // El buscador solo filtra lo que se ve en pantalla (nombre o teléfono);
  // la descarga en Excel siempre lleva a TODOS los clientes, sin importar
  // si hay algo escrito en el buscador.
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').toLowerCase().includes(q));
  }, [clientes, busqueda]);

  const exportarExcelClientes = async () => {
    setExportandoExcel(true);
    try {
      const filas = clientes.map((c) => ({
        Nombre: c.nombre,
        Correo: c.email ?? '',
        Teléfono: c.telefono ?? '',
        País: c.pais ?? '',
        'Fecha de registro': new Date(c.created_at).toLocaleString('es-PE'),
      }));
      await generarYCompartirExcel('clientes-registrados', 'Clientes', filas);
    } finally {
      setExportandoExcel(false);
    }
  };

  const exportarPdfClientes = async () => {
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

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>Invitar clientes</Text>
        <Text style={styles.cardTexto}>
          Un solo enlace para todos tus clientes — compártelo por WhatsApp. Quien lo abra entra directo como tu cliente.
        </Text>
        {cargandoEnlace ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : (
          enlaceCliente && (
            <View style={styles.enlaceRow}>
              <Text style={styles.enlaceTexto} numberOfLines={1}>
                {enlaceCliente}
              </Text>
              <Pressable style={styles.copiarBtn} onPress={copiarEnlace}>
                <Text style={styles.copiarBtnTexto}>{copiado ? '✓ Copiado' : 'Copiar'}</Text>
              </Pressable>
            </View>
          )
        )}
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>Cupo de clientes</Text>
        <Text style={styles.cardTexto}>
          {clientes.length} de {LIMITE_CLIENTES} clientes usados — te quedan {Math.max(0, LIMITE_CLIENTES - clientes.length)} cupos.
        </Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.titulo}>Clientes registrados ({clientes.length})</Text>
        <View style={styles.headerBotones}>
          <Pressable style={styles.excelBtn} onPress={exportarExcelClientes} disabled={exportandoExcel || clientes.length === 0}>
            {exportandoExcel ? <ActivityIndicator color="#fff" /> : <Text style={styles.excelBtnTexto}>Excel</Text>}
          </Pressable>
          <Pressable style={styles.pdfBtn} onPress={exportarPdfClientes} disabled={generandoPdf || clientes.length === 0}>
            {generandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>PDF</Text>}
          </Pressable>
        </View>
      </View>
      <TextInput
        style={styles.buscador}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por nombre o teléfono..."
        placeholderTextColor={colors.textMuted}
      />
      {cargandoClientes ? (
        <ActivityIndicator color={colors.primary} />
      ) : clientes.length === 0 ? (
        <Text style={styles.vacio}>Todavía no tienes clientes registrados.</Text>
      ) : clientesFiltrados.length === 0 ? (
        <Text style={styles.vacio}>Sin resultados.</Text>
      ) : (
        <View style={styles.lista}>
          {clientesFiltrados.map((item) => (
            <View key={item.id} style={[styles.card, cardShadow]}>
              <View style={styles.clienteHeader}>
                <View style={styles.clienteDatos}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <Text style={styles.dato}>{item.email}</Text>
                  <Text style={styles.dato}>
                    {item.telefono ?? 'Sin teléfono'} · {item.pais ?? 'Sin país'}
                  </Text>
                </View>
                <Pressable
                  style={styles.eliminarBtn}
                  onPress={() => eliminarCliente(item)}
                  disabled={eliminandoId === item.id}
                >
                  {eliminandoId === item.id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Text style={styles.eliminarBtnTexto}>Eliminar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, gap: 12, flexGrow: 1, paddingBottom: 48 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cardTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  enlaceRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  enlaceTexto: { flex: 1, color: colors.accent, fontSize: 12 },
  copiarBtn: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  copiarBtnTexto: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  headerBotones: { flexDirection: 'row', gap: 8 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  pdfBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 12 },
  excelBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  buscador: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.cardAlt,
  },
  nombre: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  lista: { gap: 10 },
  clienteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  clienteDatos: { flex: 1, gap: 2 },
  eliminarBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  eliminarBtnTexto: { color: colors.danger, fontSize: 12, fontWeight: '700' },
});
