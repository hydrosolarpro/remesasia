import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { PerfilNegocio, Tasa } from '../types/database';
import { OperationRow, OperationRowData, formatearTiempoRespuesta, FORMATTER_FECHA_HORA } from './OperationRow';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { LiveClock } from './LiveClock';
import { RoleTag } from './RoleTag';
import { colors, radius, cardShadow } from '../constants/theme';

const HOY = () => new Date().toISOString().slice(0, 10);

// Panel del Operador Perú: bienvenida + tasa + rentabilidad + eslogan,
// "Operaciones en curso", "Operaciones realizadas" (con búsqueda) y resumen
// del día. Lo usan tanto (operador-peru)/index.tsx (control total) como
// (operador-venezuela)/index.tsx (`restringido`, solo puede tocar el check VE).
export function PeruDashboardView({
  operadorPeruId,
  nombreUsuarioActual,
  restringido,
  puedeValidarVeAunSinSerElMismo = true,
}: {
  operadorPeruId: string;
  nombreUsuarioActual: string;
  restringido: boolean;
  puedeValidarVeAunSinSerElMismo?: boolean;
}) {
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilNegocio | null>(null);
  const [tasa, setTasa] = useState<Tasa | null>(null);
  const [operaciones, setOperaciones] = useState<OperationRowData[]>([]);
  const [validando, setValidando] = useState<{ id: string; tipo: 'peru' | 've' } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [editandoEslogan, setEditandoEslogan] = useState(false);
  const [esloganBorrador, setEsloganBorrador] = useState('');
  const [editandoRentabilidad, setEditandoRentabilidad] = useState(false);
  const [rentabilidadBorrador, setRentabilidadBorrador] = useState('');

  const cargar = useCallback(async () => {
    const [{ data: perfilData }, { data: tasaData }, { data: opsData }] = await Promise.all([
      supabase.from('perfil_negocio').select('*').eq('operador_peru_id', operadorPeruId).maybeSingle(),
      supabase
        .from('tasas')
        .select('*')
        .eq('publicada_por', operadorPeruId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('solicitudes')
        .select('*, cliente:usuarios!solicitudes_cliente_id_fkey(nombre, telefono, email)')
        .eq('negocio_operador_peru_id', operadorPeruId)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    setPerfil(perfilData as PerfilNegocio | null);
    setTasa(tasaData as Tasa | null);
    if (opsData) {
      setOperaciones(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (opsData as any[]).map((row) => ({
          ...row,
          cliente_nombre: row.cliente?.nombre ?? 'Cliente',
          cliente_telefono: row.cliente?.telefono ?? null,
          cliente_email: row.cliente?.email ?? null,
        }))
      );
    }
    setCargando(false);
  }, [operadorPeruId]);

  useEffect(() => {
    cargar();
    const channel = supabase
      .channel(`peru-dashboard-${operadorPeruId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargar, operadorPeruId]);

  const enCurso = useMemo(() => operaciones.filter((o) => !o.check_deposito_ve), [operaciones]);
  const realizadas = useMemo(() => operaciones.filter((o) => o.check_deposito_ve), [operaciones]);

  // Buscador único (nombre, teléfono, fecha, monto en soles o año) — un solo
  // campo de texto en vez de varios filtros separados, para no sobrecargar
  // la pantalla en dispositivos de gama baja.
  const realizadasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return realizadas;
    return realizadas.filter((o) => {
      const fecha = new Date(o.created_at);
      const anio = String(fecha.getFullYear());
      const fechaCorta = fecha.toLocaleDateString('es-PE');
      return (
        o.cliente_nombre.toLowerCase().includes(q) ||
        (o.cliente_telefono ?? '').toLowerCase().includes(q) ||
        o.monto_pen.toFixed(2).includes(q) ||
        anio.includes(q) ||
        fechaCorta.includes(q)
      );
    });
  }, [realizadas, busqueda]);

  // Numeración estable por operación (orden de finalización, del más
  // antiguo al más reciente) — no cambia al buscar/filtrar la lista.
  const numeracion = useMemo(() => {
    const ordenadas = [...realizadas].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const mapa = new Map<string, number>();
    ordenadas.forEach((op, i) => mapa.set(op.id, i + 1));
    return mapa;
  }, [realizadas]);

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
        'Tipo de transferencia': op.tipo_transferencia === 'pago_movil' ? 'Pago móvil' : 'Transferencia bancaria',
        'Entidad bancaria': op.beneficiario_banco,
        'N° cuenta': op.beneficiario_cuenta,
        'Monto (S/)': op.monto_pen,
        'Forma de pago': op.metodo_pago === 'yape' ? 'Yape' : op.metodo_pago === 'plin' ? 'Plin' : 'Transferencia bancaria',
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

  const resumenHoy = useMemo(() => {
    const hoy = HOY();
    const deHoy = realizadas.filter((o) => (o.check_deposito_ve_at ?? '').slice(0, 10) === hoy);
    const montoTotal = deHoy.reduce((acc, o) => acc + o.monto_pen, 0);
    const rentabilidadPct = perfil?.rentabilidad_pct ?? 0;
    return {
      nOps: deHoy.length,
      montoTotal,
      ganancia: montoTotal * (rentabilidadPct / 100),
    };
  }, [realizadas, perfil]);

  const validarPeru = async (id: string) => {
    setValidando({ id, tipo: 'peru' });
    const { error } = await supabase.rpc('validar_deposito_peru', { p_solicitud_id: id });
    setValidando(null);
    if (!error) cargar();
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
      cargar();
    } finally {
      setValidando(null);
    }
  };

  const guardarEslogan = async () => {
    await supabase
      .from('perfil_negocio')
      .update({ eslogan: esloganBorrador.trim() })
      .eq('operador_peru_id', operadorPeruId);
    setEditandoEslogan(false);
    cargar();
  };

  const guardarRentabilidad = async () => {
    const valor = Number(rentabilidadBorrador.replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0) return;
    await supabase.from('perfil_negocio').update({ rentabilidad_pct: valor }).eq('operador_peru_id', operadorPeruId);
    setEditandoRentabilidad(false);
    cargar();
  };

  const guardarCompartirRentabilidad = async (valor: boolean) => {
    await supabase.from('perfil_negocio').update({ compartir_rentabilidad_ve: valor }).eq('operador_peru_id', operadorPeruId);
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
      <RoleTag
        rol={restringido ? 'operador_venezuela' : 'operador_peru'}
        etiqueta={restringido ? 'Operador Venezuela · Solo lectura' : undefined}
      />
      <Text style={styles.bienvenida}>Bienvenido a Remesas Perú-Venezuela, {nombreUsuarioActual}</Text>
      <LiveClock />

      <View style={[styles.card, cardShadow, styles.tasaCard]}>
        <Text style={styles.tasaLabel}>Tasa del día (PEN → USDT)</Text>
        <Text style={styles.tasaValor}>{tasa ? `S/ ${tasa.tasa_pen_usdt}` : 'Sin publicar'}</Text>
        {!restringido && (
          <Pressable onPress={() => router.push('/(operador-peru)/tasa')}>
            <Text style={styles.tasaEditar}>Actualizar tasa →</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.filaDos}>
        <View style={[styles.card, cardShadow, styles.miniCard]}>
          <Text style={styles.miniLabel}>Rentabilidad</Text>
          {restringido && !perfil?.compartir_rentabilidad_ve ? (
            <Text style={styles.miniValor}>— Privado</Text>
          ) : editandoRentabilidad ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={rentabilidadBorrador}
                onChangeText={setRentabilidadBorrador}
                keyboardType="decimal-pad"
                autoFocus
                onBlur={guardarRentabilidad}
                onSubmitEditing={guardarRentabilidad}
              />
              <Text style={styles.miniValor}>%</Text>
            </View>
          ) : (
            <Pressable
              disabled={restringido}
              onPress={() => {
                setRentabilidadBorrador(String(perfil?.rentabilidad_pct ?? 0));
                setEditandoRentabilidad(true);
              }}
            >
              <Text style={styles.miniValor}>{perfil?.rentabilidad_pct ?? 0}%</Text>
            </Pressable>
          )}
        </View>
        <View style={[styles.card, cardShadow, styles.miniCard]}>
          <Text style={styles.miniLabel}>Operaciones hoy</Text>
          <Text style={styles.miniValor}>{resumenHoy.nOps}</Text>
        </View>
      </View>

      {!restringido && (
        <View style={[styles.card, cardShadow, styles.horarioCard]}>
          <Text style={styles.switchLabelCompartir}>Compartir rentabilidad con el Operador Venezuela</Text>
          <Switch
            value={perfil?.compartir_rentabilidad_ve ?? false}
            onValueChange={guardarCompartirRentabilidad}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      )}

      <View style={[styles.card, cardShadow, styles.horarioCard]}>
        <View>
          <Text style={styles.miniLabel}>Horario de atención</Text>
          <Text style={styles.horarioValor}>
            {perfil?.horario_inicio && perfil?.horario_fin ? `${perfil.horario_inicio} – ${perfil.horario_fin}` : 'Sin definir'}
          </Text>
        </View>
        {!restringido && (
          <Pressable onPress={() => router.push('/(operador-peru)/onboarding')}>
            <Text style={styles.tasaEditar}>Editar →</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.miniLabel}>Eslogan (sesión cliente)</Text>
        {editandoEslogan ? (
          <TextInput
            style={styles.esloganInput}
            value={esloganBorrador}
            onChangeText={setEsloganBorrador}
            autoFocus
            onBlur={guardarEslogan}
            onSubmitEditing={guardarEslogan}
            placeholder="Ej: Tu remesa segura, hoy mismo."
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Pressable
            disabled={restringido}
            onPress={() => {
              setEsloganBorrador(perfil?.eslogan ?? '');
              setEditandoEslogan(true);
            }}
          >
            <Text style={styles.eslogan}>{perfil?.eslogan || (restringido ? '—' : 'Toca para escribir un eslogan')}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.seccionTitulo}>Operaciones en curso ({enCurso.length})</Text>
      {enCurso.length === 0 && <Text style={styles.vacio}>No hay operaciones en curso.</Text>}
      <View style={styles.grid}>
        {enCurso.map((op) => (
          <OperationRow
            key={op.id}
            style={styles.gridItem}
            op={op}
            puedeValidarPeru={!restringido}
            puedeValidarVe={!restringido || puedeValidarVeAunSinSerElMismo}
            onValidarPeru={() => validarPeru(op.id)}
            onValidarVe={(comprobanteUri, comprobanteExt) => validarVe(op.id, comprobanteUri, comprobanteExt)}
            validandoPeru={validando?.id === op.id && validando.tipo === 'peru'}
            validandoVe={validando?.id === op.id && validando.tipo === 've'}
          />
        ))}
      </View>

      <View style={styles.seccionHeaderRow}>
        <Text style={styles.seccionTitulo}>Operaciones realizadas ({realizadas.length})</Text>
        <Pressable style={styles.excelBtn} onPress={exportarExcel} disabled={exportando || realizadasFiltradas.length === 0}>
          {exportando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.excelBtnTexto}>Excel</Text>}
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
      <View style={styles.grid}>
        {realizadasFiltradas.map((op) => (
          <OperationRow
            key={op.id}
            style={styles.gridItem}
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

      <View style={[styles.card, cardShadow, styles.resumenCard]}>
        <Text style={styles.seccionTitulo}>Resumen de hoy</Text>
        <View style={styles.resumenRow}>
          <ResumenItem label="Operaciones" valor={String(resumenHoy.nOps)} />
          <ResumenItem label="Monto recibido" valor={`S/ ${resumenHoy.montoTotal.toFixed(2)}`} />
          <ResumenItem label="Ganancia" valor={`S/ ${resumenHoy.ganancia.toFixed(2)}`} destacado />
        </View>
      </View>
    </ScrollView>
  );
}

function ResumenItem({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <View style={styles.resumenItem}>
      <Text style={styles.resumenLabel}>{label}</Text>
      <Text style={[styles.resumenValor, destacado && { color: colors.accent }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  bienvenida: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: -4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  tasaCard: { alignItems: 'flex-start', gap: 4, marginTop: 8 },
  tasaLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  tasaValor: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  tasaEditar: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 4 },
  filaDos: { flexDirection: 'row', gap: 12 },
  miniCard: { flex: 1, gap: 4 },
  miniLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  miniValor: { color: colors.text, fontSize: 20, fontWeight: '800' },
  horarioCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  horarioValor: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  switchLabelCompartir: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  editRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  editInput: { color: colors.text, fontSize: 20, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: colors.primary, minWidth: 50 },
  eslogan: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4, fontStyle: 'italic' },
  esloganInput: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 4 },
  seccionTitulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  excelBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  // 1 columna en móvil; en pantallas anchas (operador en web/tablet) las
  // tarjetas se acomodan solas en 2-3 columnas gracias al flexWrap.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexGrow: 1, flexBasis: 340, minWidth: 300 },
  buscador: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.cardAlt,
  },
  resumenCard: { marginTop: 8, gap: 8 },
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resumenItem: { alignItems: 'center', flex: 1 },
  resumenLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  resumenValor: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
});
