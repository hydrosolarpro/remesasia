import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { generarYCompartirPdf } from '../../lib/pdfReporte';
import { generarYCompartirExcel } from '../../lib/excelReporte';
import { obtenerOCrearInvitacionCliente, construirEnlaceLandingCliente, construirEnlaceInvitacion } from '../../lib/invitaciones';
import { construirEnlaceWhatsAppGenerico } from '../../lib/whatsapp';
import { resolverContextoOperador } from '../../lib/sesionOperador';
import { LIMITE_CLIENTES } from '../../lib/plan';
import { Usuario } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

export default function ClientesRegistrados() {
  const { usuario } = useAuth();
  const [negocioId, setNegocioId] = useState<string | null | undefined>(undefined);
  const [miembroId, setMiembroId] = useState<string | null>(null);
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [enlaceCliente, setEnlaceCliente] = useState<string | null>(null);
  const [cargandoEnlace, setCargandoEnlace] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState('Remesas Perú-Venezuela');
  const [telefonoOperador, setTelefonoOperador] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    resolverContextoOperador(usuario).then(async (ctx) => {
      if (!ctx.negocioId) return;
      setNegocioId(ctx.negocioId);
      setMiembroId(ctx.miembroId);
      setEsPrincipal(ctx.tipo === 'principal');
      const { data: perfil } = await supabase.from('perfil_negocio').select('nombre_negocio').eq('operador_peru_id', ctx.negocioId).maybeSingle();
      if (perfil?.nombre_negocio) setNombreNegocio(perfil.nombre_negocio);
      if (ctx.tipo === 'miembro' && ctx.miembroId) {
        const { data: m } = await supabase.from('operador_peru_miembro').select('telefono').eq('id', ctx.miembroId).maybeSingle();
        setTelefonoOperador(m?.telefono ?? null);
      } else {
        setTelefonoOperador(usuario.telefono ?? null);
      }
    });
  }, [usuario]);

  const cargarClientes = useCallback(() => {
    if (!negocioId) return;
    setCargandoClientes(true);
    let query = supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'cliente')
      .eq('negocio_operador_peru_id', negocioId)
      .is('eliminado_at', null);
    // Un miembro de Perú solo ve los clientes que él mismo invitó.
    if (!esPrincipal && miembroId) {
      query = query.eq('invitado_por_operador_miembro_id', miembroId);
    }
    query.order('created_at', { ascending: false }).then(({ data }) => {
      setClientes((data as Usuario[] | null) ?? []);
      setCargandoClientes(false);
    });
  }, [negocioId, esPrincipal, miembroId]);

  useFocusEffect(
    useCallback(() => {
      cargarClientes();
    }, [cargarClientes])
  );

  // Borrado lógico: marca al cliente como eliminado y borra su acceso (ver
  // supabase/functions/eliminar-cliente). Su fila de `usuarios` no se
  // borra físicamente -- así sus solicitudes pasadas conservan su nombre
  // y datos completos en reportes/exportes, sin importar cuánto historial
  // tenga.
  const eliminarCliente = (item: Usuario) => {
    const confirmarYBorrar = async () => {
      setEliminandoId(item.id);
      const { data, error } = await supabase.functions.invoke('eliminar-cliente', { body: { cliente_id: item.id } });
      setEliminandoId(null);
      // supabase.functions.invoke() NO pone el cuerpo JSON del error en
      // `data` cuando la función responde con status distinto de 2xx --
      // ahí `data` es null y solo queda `error.message` genérico
      // ("Edge Function returned a non-2xx status code"). El mensaje real
      // que arma la función (p.ej. "tiene solicitudes registradas") viaja
      // en `error.context`, la Response cruda del fetch.
      let mensajeError: string | null = null;
      if (error) {
        mensajeError = error.message;
        const contexto = (error as { context?: unknown }).context;
        if (contexto instanceof Response) {
          try {
            const cuerpo = await contexto.json();
            if (cuerpo?.error) mensajeError = cuerpo.error;
          } catch {
            // Respuesta sin JSON válido: se mantiene error.message.
          }
        } else if ((data as { error?: string } | null)?.error) {
          mensajeError = (data as { error: string }).error;
        }
      }
      if (mensajeError) {
        if (Platform.OS === 'web') window.alert(mensajeError);
        else Alert.alert('No se pudo eliminar', mensajeError);
        return;
      }
      cargarClientes();
    };

    const mensaje = `¿Eliminar a ${item.nombre} de tus clientes? Perderá el acceso a la app; sus solicitudes anteriores se conservan en tus reportes. Esta acción no se puede deshacer.`;
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
    obtenerOCrearInvitacionCliente(negocioId, miembroId)
      .then((inv) => setEnlaceCliente(construirEnlaceLandingCliente(inv.token)))
      .finally(() => setCargandoEnlace(false));
  }, [negocioId, miembroId]);

  const copiarEnlace = async () => {
    if (!enlaceCliente) return;
    await Clipboard.setStringAsync(enlaceCliente);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const abrirLanding = () => {
    if (enlaceCliente) Linking.openURL(enlaceCliente);
  };

  const abrirWhatsAppInvitacion = () => {
    if (!enlaceCliente) return;
    const token = enlaceCliente.split('?op=')[1] ?? '';
    const enlaceSesionCliente = construirEnlaceInvitacion(decodeURIComponent(token));
    const mensaje = `Bienvenid@ [Nombre del cliente] a ${nombreNegocio} donde prestamos el servicio de remesas de Perú a Venezuela. Accede ${enlaceSesionCliente} para disfrutar de una experiencia digital y de eficiencia en tus remesas a tus familiares y amigos en Venezuela`;
    const enlace = construirEnlaceWhatsAppGenerico(telefonoOperador, mensaje);
    if (!enlace) {
      Alert.alert('Sin teléfono', 'Completa tu teléfono en tu perfil para poder enviar la invitación por WhatsApp.');
      return;
    }
    Linking.openURL(enlace);
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
        <Text style={styles.cardTitulo}>Invitación a tus clientes</Text>
        <Text style={styles.cardTexto}>Envía los siguientes enlaces</Text>
        {cargandoEnlace ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : (
          <>
            <Pressable style={styles.botonLanding} onPress={abrirLanding}>
              <Text style={styles.botonLandingTexto}>🌐 Información de servicio - Landing page cliente</Text>
            </Pressable>
            <Pressable style={styles.botonWhatsApp} onPress={abrirWhatsAppInvitacion}>
              <Text style={styles.botonWhatsAppTexto}>💬 Acceso por vía WhatsApp</Text>
            </Pressable>
            <View style={styles.enlaceRow}>
              <Text style={styles.enlaceTexto} numberOfLines={1}>
                {enlaceCliente}
              </Text>
              <Pressable style={styles.copiarBtn} onPress={copiarEnlace}>
                <Text style={styles.copiarBtnTexto}>{copiado ? '✓ Copiado' : 'Copiar'}</Text>
              </Pressable>
            </View>
          </>
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
  botonLanding: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 6 },
  botonLandingTexto: { color: colors.text, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  botonWhatsApp: { backgroundColor: colors.success, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 6 },
  botonWhatsAppTexto: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  enlaceRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
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
