import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { DateRangeFilter } from './DateRangeFilter';
import { RangoFecha, calcularRango } from '../lib/dateRange';
import { generarYCompartirPdf, prepararVentanaWeb } from '../lib/pdfReporte';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { planLabel } from '../lib/plan';
import { colors, radius } from '../constants/theme';

type EstadoPago = 'pendiente' | 'verificado' | 'rechazado';
type FiltroEstado = 'todos' | EstadoPago;
type FiltroTipo = 'todos' | 'suscripcion' | 'cambio';

interface EventoPago {
  id: string;
  tipo: 'suscripcion' | 'cambio';
  operadorId: string;
  operador: string;
  email: string;
  concepto: string;
  monto: number;
  estado: EstadoPago;
  comprobante: boolean;
  fecha: string; // ISO (created_at)
}

const ESTADOS: { id: FiltroEstado; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'verificado', label: 'Verificados' },
  { id: 'rechazado', label: 'Rechazados' },
];
const TIPOS: { id: FiltroTipo; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'suscripcion', label: 'Suscripción' },
  { id: 'cambio', label: 'Cambio de plan' },
];

const limiteLocalISO = (fecha: string) => new Date(`${fecha}T00:00:00`).toISOString();
const fmtFecha = (iso: string) => new Date(iso).toLocaleString('es-PE');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Estadística de pagos de los operadores principales (sesión administrador).
// Misma lógica que EstadisticasView: el rango de fechas se consulta en
// Supabase (pagos_suscripcion + cambios_plan_pendientes, ya guardados ahí),
// se filtra/busca en pantalla y el resultado visible se exporta a Excel y PDF.
export function AdminEstadisticaPagos() {
  const [rango, setRango] = useState<RangoFecha | null>(null);
  const [eventos, setEventos] = useState<EventoPago[]>([]);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('todos');
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);

  const buscar = useCallback(async (r: RangoFecha | null) => {
    if (!r) return;
    setRango(r);
    setCargando(true);
    const desde = limiteLocalISO(r.desde);
    const hasta = limiteLocalISO(r.hasta);

    const [{ data: usuarios }, { data: pagos }, { data: cambios }] = await Promise.all([
      supabase.from('usuarios').select('id, nombre, email').eq('rol', 'operador_peru'),
      supabase
        .from('pagos_suscripcion')
        .select('id, operador_peru_id, periodo, estado, monto, monto_por_definir, comprobante_url, created_at')
        .gte('created_at', desde)
        .lt('created_at', hasta),
      supabase
        .from('cambios_plan_pendientes')
        .select('id, operador_peru_id, plan_solicitado, estado, monto, comprobante_url, created_at')
        .gte('created_at', desde)
        .lt('created_at', hasta),
    ]);

    const mapa = new Map<string, { nombre: string; email: string }>();
    for (const u of (usuarios as { id: string; nombre: string; email: string | null }[] | null) ?? [])
      mapa.set(u.id, { nombre: u.nombre, email: u.email ?? '' });

    const lista: EventoPago[] = [
      ...((pagos as { id: string; operador_peru_id: string; periodo: string; estado: EstadoPago; monto: number; monto_por_definir: boolean; comprobante_url: string | null; created_at: string }[] | null) ?? []).map((p) => ({
        id: p.id,
        tipo: 'suscripcion' as const,
        operadorId: p.operador_peru_id,
        operador: mapa.get(p.operador_peru_id)?.nombre ?? '—',
        email: mapa.get(p.operador_peru_id)?.email ?? '',
        concepto: p.monto_por_definir ? `UNLIMITED a consultar (${p.periodo})` : `Suscripción ${p.periodo}`,
        monto: Number(p.monto),
        estado: p.estado,
        comprobante: !!p.comprobante_url,
        fecha: p.created_at,
      })),
      ...((cambios as { id: string; operador_peru_id: string; plan_solicitado: string; estado: EstadoPago; monto: number; comprobante_url: string | null; created_at: string }[] | null) ?? []).map((c) => ({
        id: c.id,
        tipo: 'cambio' as const,
        operadorId: c.operador_peru_id,
        operador: mapa.get(c.operador_peru_id)?.nombre ?? '—',
        email: mapa.get(c.operador_peru_id)?.email ?? '',
        concepto: `Cambio a ${planLabel(c.plan_solicitado)}`,
        monto: Number(c.monto),
        estado: c.estado,
        comprobante: !!c.comprobante_url,
        fecha: c.created_at,
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));

    setEventos(lista);
    setBuscado(true);
    setCargando(false);
  }, []);

  // Primera carga: mes actual.
  useEffect(() => {
    buscar(calcularRango('mes', new Date().toISOString().slice(0, 7), ''));
  }, [buscar]);

  const visibles = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return eventos.filter(
      (e) =>
        (estado === 'todos' || e.estado === estado) &&
        (tipo === 'todos' || e.tipo === tipo) &&
        (!q || `${e.operador} ${e.email} ${e.concepto}`.toLowerCase().includes(q))
    );
  }, [eventos, texto, estado, tipo]);

  const cuenta = (e: EstadoPago) => visibles.filter((x) => x.estado === e).length;
  const totalVerificado = visibles.filter((x) => x.estado === 'verificado').reduce((a, x) => a + x.monto, 0);
  const totalPendiente = visibles.filter((x) => x.estado === 'pendiente').reduce((a, x) => a + x.monto, 0);

  const etiquetaFiltros = () =>
    [
      rango ? `Período: ${rango.etiqueta}` : '',
      estado !== 'todos' ? `Estado: ${estado}` : '',
      tipo !== 'todos' ? `Tipo: ${tipo === 'cambio' ? 'cambio de plan' : 'suscripción'}` : '',
      texto.trim() ? `Búsqueda: "${texto.trim()}"` : '',
    ]
      .filter(Boolean)
      .join(' — ');

  const exportarPdf = async () => {
    const ventanaWeb = prepararVentanaWeb();
    setGenerandoPdf(true);
    try {
      const filas = visibles
        .map(
          (e) => `<tr>
            <td>${esc(fmtFecha(e.fecha))}</td><td>${esc(e.operador)}</td><td>${esc(e.email)}</td>
            <td>${esc(e.concepto)}</td><td>S/ ${e.monto.toFixed(2)}</td><td>${e.estado}</td><td>${e.comprobante ? 'Sí' : 'No'}</td>
          </tr>`
        )
        .join('');
      const html = `
        <h2>Resumen</h2>
        <p>Pendientes: ${cuenta('pendiente')} (S/ ${totalPendiente.toFixed(2)}) · Verificados: ${cuenta('verificado')} (S/ ${totalVerificado.toFixed(2)}) · Rechazados: ${cuenta('rechazado')}</p>
        <h2 style="margin-top:24px;">Detalle de pagos (${visibles.length})</h2>
        <table>
          <thead><tr><th>Fecha</th><th>Operador</th><th>Correo</th><th>Concepto</th><th>Monto</th><th>Estado</th><th>Comprobante</th></tr></thead>
          <tbody>${filas || '<tr><td colspan="7">Sin pagos con estos filtros.</td></tr>'}</tbody>
        </table>`;
      await generarYCompartirPdf('Estadística de pagos de operadores', etiquetaFiltros(), html, ventanaWeb);
    } finally {
      setGenerandoPdf(false);
    }
  };

  const exportarExcel = async () => {
    setExportandoExcel(true);
    try {
      const filas: Record<string, string | number>[] = visibles.map((e) => ({
        Fecha: fmtFecha(e.fecha),
        Operador: e.operador,
        Correo: e.email,
        Tipo: e.tipo === 'cambio' ? 'Cambio de plan' : 'Suscripción',
        Concepto: e.concepto,
        'Monto (S/)': e.monto,
        Estado: e.estado,
        Comprobante: e.comprobante ? 'Sí' : 'No',
      }));
      filas.push({
        Fecha: 'TOTAL VERIFICADO',
        Operador: '',
        Correo: '',
        Tipo: '',
        Concepto: '',
        'Monto (S/)': totalVerificado,
        Estado: '',
        Comprobante: '',
      });
      await generarYCompartirExcel('estadistica-pagos-operadores', 'Pagos', filas);
    } finally {
      setExportandoExcel(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <DateRangeFilter onCambio={buscar} />

      <TextInput
        style={styles.input}
        value={texto}
        onChangeText={setTexto}
        placeholder="Buscar por operador, correo o concepto"
        placeholderTextColor={colors.textMuted}
      />
      <Chips opciones={ESTADOS} valor={estado} onCambio={setEstado} />
      <Chips opciones={TIPOS} valor={tipo} onCambio={setTipo} />

      {cargando && <ActivityIndicator color={colors.primary} />}

      {!cargando && buscado && (
        <>
          <View style={styles.resumenFila}>
            <Resumen label="Pendientes" valor={String(cuenta('pendiente'))} color={colors.warning} />
            <Resumen label="Verificados" valor={String(cuenta('verificado'))} />
            <Resumen label="Rechazados" valor={String(cuenta('rechazado'))} color={colors.danger} />
          </View>
          <Text style={styles.total}>Total verificado: S/ {totalVerificado.toFixed(2)} · Por verificar: S/ {totalPendiente.toFixed(2)}</Text>

          {visibles.length === 0 && <Text style={styles.vacio}>No hay pagos con estos filtros.</Text>}
          {visibles.map((e) => (
            <View key={`${e.tipo}-${e.id}`} style={styles.fila}>
              <View style={{ flex: 1 }}>
                <Text style={styles.operador}>{e.operador}</Text>
                <Text style={styles.detalle}>{e.concepto} · {fmtFecha(e.fecha)}</Text>
                <Text style={styles.detalle}>{e.email}{e.comprobante ? ' · con comprobante' : ' · sin comprobante'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.monto}>S/ {e.monto.toFixed(2)}</Text>
                <Text style={[styles.estado, e.estado === 'verificado' ? styles.ok : e.estado === 'rechazado' ? styles.mal : styles.pend]}>{e.estado}</Text>
              </View>
            </View>
          ))}

          <View style={styles.exportFila}>
            <Pressable style={styles.excelBtn} onPress={exportarExcel} disabled={exportandoExcel || visibles.length === 0}>
              {exportandoExcel ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTexto}>Descargar Excel</Text>}
            </Pressable>
            <Pressable style={styles.pdfBtn} onPress={exportarPdf} disabled={generandoPdf || visibles.length === 0}>
              {generandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.btnTexto}>Descargar PDF</Text>}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function Chips<T extends string>({ opciones, valor, onCambio }: { opciones: { id: T; label: string }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <View style={styles.chipsFila}>
      {opciones.map((o) => (
        <Pressable key={o.id} style={[styles.chip, valor === o.id && styles.chipActivo]} onPress={() => onCambio(o.id)}>
          <Text style={[styles.chipTexto, valor === o.id && styles.chipTextoActivo]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Resumen({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <View style={styles.resumenItem}>
      <Text style={styles.resumenLabel}>{label}</Text>
      <Text style={[styles.resumenValor, color ? { color } : null]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, color: colors.text, backgroundColor: colors.cardAlt },
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextoActivo: { color: colors.text },
  resumenFila: { flexDirection: 'row', gap: 8 },
  resumenItem: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.sm, padding: 10 },
  resumenLabel: { color: colors.textMuted, fontSize: 12 },
  resumenValor: { color: colors.text, fontSize: 20, fontWeight: '800' },
  total: { color: colors.text, fontWeight: '700', fontSize: 13 },
  vacio: { color: colors.textMuted, fontSize: 13 },
  fila: { flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10 },
  operador: { color: colors.text, fontWeight: '700', fontSize: 14 },
  detalle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  monto: { color: colors.accent, fontWeight: '800', fontSize: 14 },
  estado: { fontSize: 12, fontWeight: '700', marginTop: 2, textTransform: 'capitalize' },
  ok: { color: colors.success },
  mal: { color: colors.danger },
  pend: { color: colors.warning },
  exportFila: { flexDirection: 'row', gap: 8, marginTop: 4 },
  excelBtn: { flex: 1, backgroundColor: colors.success, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  pdfBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  btnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
