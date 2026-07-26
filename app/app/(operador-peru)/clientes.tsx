import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { generarYCompartirPdf } from '../../lib/pdfReporte';
import { generarYCompartirExcel } from '../../lib/excelReporte';
import { obtenerOCrearInvitacionCliente, construirEnlaceInvitacion } from '../../lib/invitaciones';
import { OperationRow, OperationRowData, formatearTiempoRespuesta, FORMATTER_FECHA_HORA } from '../../components/OperationRow';
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

  const [enlaceCliente, setEnlaceCliente] = useState<string | null>(null);
  const [cargandoEnlace, setCargandoEnlace] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const [operaciones, setOperaciones] = useState<OperationRowData[]>([]);
  const [cargandoOps, setCargandoOps] = useState(true);
  const [validando, setValidando] = useState<{ id: string; tipo: 'peru' | 've' } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [negocioId])
  );

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

  const cargarOperaciones = useCallback(async () => {
    if (!negocioId) return;
    setCargandoOps(true);
    const { data } = await supabase
      .from('solicitudes')
      .select(
        '*, cliente:usuarios!solicitudes_cliente_id_fkey(nombre, telefono, email), validador_peru:usuarios!solicitudes_validado_peru_por_fkey(nombre), validador_ve:usuarios!solicitudes_validado_ve_por_fkey(nombre)'
      )
      .eq('negocio_operador_peru_id', negocioId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) {
      setOperaciones(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any[]).map((row) => ({
          ...row,
          cliente_nombre: row.cliente?.nombre ?? 'Cliente',
          cliente_telefono: row.cliente?.telefono ?? null,
          cliente_email: row.cliente?.email ?? null,
          validador_peru_nombre: row.validador_peru?.nombre ?? null,
          validador_ve_nombre: row.validador_ve?.nombre ?? null,
        }))
      );
    }
    setCargandoOps(false);
  }, [negocioId]);

  useEffect(() => {
    if (!negocioId) return;
    cargarOperaciones();
    const channel = supabase
      .channel(`clientes-ops-${negocioId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => cargarOperaciones())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [negocioId, cargarOperaciones]);

  const enCurso = useMemo(() => operaciones.filter((o) => !o.check_deposito_ve), [operaciones]);
  const realizadas = useMemo(() => operaciones.filter((o) => o.check_deposito_ve), [operaciones]);

  const realizadasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return realizadas;
    return realizadas.filter((o) => {
      const fecha = new Date(o.created_at);
      return (
        o.cliente_nombre.toLowerCase().includes(q) ||
        (o.cliente_telefono ?? '').toLowerCase().includes(q) ||
        o.monto_pen.toFixed(2).includes(q) ||
        String(fecha.getFullYear()).includes(q) ||
        fecha.toLocaleDateString('es-PE').includes(q)
      );
    });
  }, [realizadas, busqueda]);

  const numeracion = useMemo(() => {
    const ordenadas = [...operaciones].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const mapa = new Map<string, number>();
    ordenadas.forEach((op, i) => mapa.set(op.id, i + 1));
    return mapa;
  }, [operaciones]);

  const validarPeru = async (id: string) => {
    setValidando({ id, tipo: 'peru' });
    await supabase.rpc('validar_deposito_peru', { p_solicitud_id: id });
    setValidando(null);
  };

  const validarVe = async (id: string, comprobanteUri: string, comprobanteExt: string) => {
    setValidando({ id, tipo: 've' });
    try {
      const path = `${id}/comprobante-vz.${comprobanteExt}`;
      const blob = await (await fetch(comprobanteUri)).blob();
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);
      const { error } = await supabase.rpc('validar_deposito_venezuela', {
        p_solicitud_id: id,
        p_comprobante_url: publicUrl.publicUrl,
      });
      if (error) throw error;
    } finally {
      setValidando(null);
    }
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const filas = realizadasFiltradas.map((op) => ({
        '#': numeracion.get(op.id) ?? '',
        Cliente: op.cliente_nombre,
        Teléfono: op.cliente_telefono ?? '',
        Correo: op.cliente_email ?? '',
        'Beneficiario (VE)': op.beneficiario_nombre,
        'C.I.': op.beneficiario_ci ?? '',
        'Monto (S/)': op.monto_pen,
        'Recibe (Bs)': op.monto_ves,
        'Validado en Perú': op.check_deposito_peru_at ? FORMATTER_FECHA_HORA.format(new Date(op.check_deposito_peru_at)) : '',
        'Validado en Venezuela': op.check_deposito_ve_at ? FORMATTER_FECHA_HORA.format(new Date(op.check_deposito_ve_at)) : '',
        'Tiempo de respuesta':
          op.check_deposito_peru_at && op.check_deposito_ve_at
            ? formatearTiempoRespuesta(op.check_deposito_peru_at, op.check_deposito_ve_at)
            : '',
      }));
      await generarYCompartirExcel('operaciones-realizadas', 'Operaciones', filas);
    } finally {
      setExportando(false);
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

      <View style={styles.header}>
        <Text style={styles.titulo}>Clientes registrados ({clientes.length})</Text>
        <Pressable style={styles.pdfBtn} onPress={exportarPdfClientes} disabled={generandoPdf || clientes.length === 0}>
          {generandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>PDF</Text>}
        </Pressable>
      </View>
      {cargandoClientes ? (
        <ActivityIndicator color={colors.primary} />
      ) : clientes.length === 0 ? (
        <Text style={styles.vacio}>Todavía no tienes clientes registrados.</Text>
      ) : (
        <View style={styles.lista}>
          {clientes.map((item) => (
            <View key={item.id} style={[styles.card, cardShadow]}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.dato}>{item.email}</Text>
              <Text style={styles.dato}>
                {item.telefono ?? 'Sin teléfono'} · {item.pais ?? 'Sin país'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {cargandoOps ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : (
        <>
          <Text style={styles.titulo}>Operaciones en curso ({enCurso.length})</Text>
          {enCurso.length === 0 && <Text style={styles.vacio}>No hay operaciones en curso.</Text>}
          <View style={styles.lista}>
            {enCurso.map((op) => (
              <OperationRow
                key={op.id}
                op={op}
                numero={numeracion.get(op.id)}
                puedeValidarPeru
                puedeValidarVe
                onValidarPeru={() => validarPeru(op.id)}
                onValidarVe={(uri, ext) => validarVe(op.id, uri, ext)}
                validandoPeru={validando?.id === op.id && validando.tipo === 'peru'}
                validandoVe={validando?.id === op.id && validando.tipo === 've'}
              />
            ))}
          </View>

          <View style={styles.header}>
            <Text style={styles.titulo}>Operaciones realizadas ({realizadas.length})</Text>
            <Pressable style={styles.pdfBtn} onPress={exportarExcel} disabled={exportando || realizadasFiltradas.length === 0}>
              {exportando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>Excel</Text>}
            </Pressable>
          </View>
          <TextInput
            style={styles.buscador}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre, teléfono, fecha, monto o año..."
            placeholderTextColor={colors.textMuted}
          />
          {realizadasFiltradas.length === 0 && <Text style={styles.vacio}>Sin resultados.</Text>}
          <View style={styles.lista}>
            {realizadasFiltradas.map((op) => (
              <OperationRow
                key={op.id}
                op={op}
                numero={numeracion.get(op.id)}
                puedeValidarPeru={false}
                puedeValidarVe={false}
                onValidarPeru={() => {}}
                onValidarVe={() => {}}
                validandoPeru={false}
                validandoVe={false}
              />
            ))}
          </View>
        </>
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
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  pdfBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 12 },
  nombre: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  lista: { gap: 10 },
  buscador: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.cardAlt,
  },
});
