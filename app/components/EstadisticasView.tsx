import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { DateRangeFilter } from './DateRangeFilter';
import { EstadisticaGraficos } from './EstadisticaGraficos';
import { generarYCompartirPdf } from '../lib/pdfReporte';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { RangoFecha, calcularRango } from '../lib/dateRange';
import { PerfilNegocio, Solicitud } from '../types/database';
import { colors, radius, cardShadow } from '../constants/theme';

const HOY = () => new Date().toISOString().slice(0, 10);

// Ver DateRangeFilter.tsx: evita que un swipe vertical (p.ej. "pull to
// refresh") se confunda con un gesto del navegador y saque al usuario de
// la app mientras interactúa con el buscador.
const SIN_OVERSCROLL_Y = Platform.OS === 'web' ? ({ overscrollBehaviorY: 'contain' } as object) : null;

interface Punto {
  etiqueta: string;
  nOps: number;
  monto: number;
}

interface SolicitudConValidadores extends Solicitud {
  validador_peru_nombre: string | null;
  validador_ve_nombre: string | null;
  operador_peru_atiende: string | null;
}

interface DesglosePorMiembro {
  nombre: string;
  nOps: number;
  monto: number;
}

function agruparPorValidador(
  operaciones: SolicitudConValidadores[],
  campo: 'validador_peru_nombre' | 'validador_ve_nombre'
): DesglosePorMiembro[] {
  const grupos = new Map<string, DesglosePorMiembro>();
  for (const op of operaciones) {
    const nombre = op[campo] ?? 'Sin registrar';
    const actual = grupos.get(nombre) ?? { nombre, nOps: 0, monto: 0 };
    actual.nOps += 1;
    actual.monto += op.monto_pen;
    grupos.set(nombre, actual);
  }
  return [...grupos.values()].sort((a, b) => b.monto - a.monto);
}

// Estadísticas de operaciones — usada tanto por el Operador Perú (dueño
// del negocio o miembro de su equipo) como por el Operador Venezuela
// (`restringido`, ve todo menos la rentabilidad salvo que el operador
// Perú la haya compartido).
export function EstadisticasView({
  operadorPeruId,
  restringido = false,
  esDuenio = !restringido,
  tipoSesion = 'principal',
  miembroId = null,
  veId = null,
  miembrosAsignadosIds = [],
}: {
  operadorPeruId: string;
  restringido?: boolean;
  /** Solo el dueño del negocio ve el desglose por miembro de equipo (Perú y Venezuela). */
  esDuenio?: boolean;
  /** Cómo se debe recortar la vista: el miembro ve solo SUS clientes, el
   *  Operador Venezuela solo los de los miembros que le fueron asignados,
   *  y el principal ve todo (con el filtro "Mis clientes" disponible). */
  tipoSesion?: 'principal' | 'miembro' | 'venezuela';
  miembroId?: string | null;
  veId?: string | null;
  miembrosAsignadosIds?: string[];
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [cargando, setCargando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [rango, setRango] = useState<RangoFecha | null>(null);
  const [operaciones, setOperaciones] = useState<SolicitudConValidadores[]>([]);
  const [rentabilidadPct, setRentabilidadPct] = useState(0);
  const [compartirRentabilidad, setCompartirRentabilidad] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [soloMisClientes, setSoloMisClientes] = useState(false);

  const puedeVerGanancia = !restringido || compartirRentabilidad;
  const esHoy = rango !== null && rango.desde === HOY();

  // Nombre legible del operador de Perú que atiende cada operación: si fue
  // derivada a un miembro del equipo, es el miembro; si no, es el
  // operador principal de Perú.
  const cargarMiembros = async (): Promise<Map<string, string>> => {
    const { data } = await supabase
      .from('operador_peru_miembro')
      .select('id, nombre')
      .eq('operador_peru_id', operadorPeruId);
    const mapa = new Map<string, string>();
    for (const m of (data as { id: string; nombre: string }[] | null) ?? []) mapa.set(m.id, m.nombre);
    return mapa;
  };

  // Trae los datos del rango sin tocar scroll ni el spinner de carga --
  // se usa tanto desde `buscar` (con esos efectos) como desde el refresco
  // silencioso por Realtime, que NO debe interrumpir al usuario si en ese
  // momento está escribiendo en el buscador o leyendo resultados.
  const cargarDatos = async (rangoConsulta: RangoFecha) => {
    const [miembros, [{ data: ops }, { data: perfil }]] = await Promise.all([
      cargarMiembros(),
      Promise.all([
        (() => {
          let query = supabase
            .from('solicitudes')
            .select(
              '*, validador_peru:usuarios!solicitudes_validado_peru_por_fkey(nombre), validador_ve:usuarios!solicitudes_validado_ve_por_fkey(nombre)'
            )
            .eq('check_deposito_ve', true)
            .eq('negocio_operador_peru_id', operadorPeruId)
            .gte('created_at', rangoConsulta.desde)
            .lt('created_at', rangoConsulta.hasta)
            .order('created_at', { ascending: true });

          // El miembro solo ve operaciones de SUS clientes; el Operador
          // Venezuela solo las de los miembros que le fueron asignados.
          if (tipoSesion === 'miembro' && miembroId) {
            query = query.eq('operador_peru_miembro_id', miembroId);
          } else if (tipoSesion === 'venezuela') {
            if (miembrosAsignadosIds.length === 0) {
              query = query.in('operador_peru_miembro_id', ['00000000-0000-0000-0000-000000000000']);
            } else {
              query = query.in('operador_peru_miembro_id', miembrosAsignadosIds);
            }
          }
          return query;
        })(),
        supabase.from('perfil_negocio').select('*').eq('operador_peru_id', operadorPeruId).maybeSingle(),
      ]),
    ]);

    setOperaciones(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ops as any[]) ?? []).map((row) => ({
        ...row,
        validador_peru_nombre: row.validador_peru?.nombre ?? null,
        validador_ve_nombre: row.validador_ve?.nombre ?? null,
        operador_peru_atiende: row.operador_peru_miembro_id
          ? (miembros.get(row.operador_peru_miembro_id) ?? 'Operador de Perú (equipo)')
          : 'Operador principal de Perú',
      }))
    );
    const p = perfil as PerfilNegocio | null;
    setRentabilidadPct(p?.rentabilidad_pct ?? 0);
    setCompartirRentabilidad(p?.compartir_rentabilidad_ve ?? false);
  };

  // Búsqueda iniciada por el usuario (chips + botón "Buscar"): esta sí
  // sube el scroll al inicio y muestra el spinner, porque reemplaza lo
  // que el usuario está viendo a propósito.
  const buscar = async (nuevoRango: RangoFecha | null) => {
    setRango(nuevoRango);
    if (!nuevoRango) return;
    // Antes de recargar, sube al inicio: si había resultados de una
    // búsqueda anterior visibles más abajo, al desaparecer mientras carga
    // la página "saltaba" porque el scroll se quedaba apuntando a un
    // espacio que ya no existía.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setCargando(true);
    setBuscado(true);
    await cargarDatos(nuevoRango);
    setCargando(false);
  };

  // Al entrar a la pantalla, carga el día de hoy solo, sin que el usuario
  // tenga que buscar manualmente. A propósito NO se refresca sola en
  // segundo plano (se probó con Realtime y, aunque en silencio no movía
  // el scroll, igual reordenaba/cambiaba números mientras el usuario
  // escribía en el buscador y se sentía como un salto) -- para ver datos
  // más recientes, el usuario vuelve a tocar "Buscar".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    buscar(calcularRango('dia', HOY(), HOY()));
  }, [operadorPeruId]);

  // Desglose de operaciones y montos por cada persona que validó — tanto
  // del lado Perú (dueño o miembros de equipo) como del lado Venezuela.
  // Cuando el principal activa "Mis clientes", se ocultan las operaciones
  // derivadas a miembros del equipo (ver filtro en el JSX).
  const operacionesVisibles = useMemo(() => {
    if (!soloMisClientes) return operaciones;
    return operaciones.filter((o) => !o.operador_peru_miembro_id);
  }, [operaciones, soloMisClientes]);

  const desglosePeru = useMemo(() => agruparPorValidador(operacionesVisibles, 'validador_peru_nombre'), [operacionesVisibles]);
  const desgloseVe = useMemo(() => agruparPorValidador(operacionesVisibles, 'validador_ve_nombre'), [operacionesVisibles]);

  // La granularidad del gráfico se adapta al tamaño del rango elegido: por
  // día si es corto, por mes si abarca varios meses, y por año si abarca
  // varios años.
  const puntos = useMemo<Punto[]>(() => {
    if (!rango) return [];
    const diasSpan = (new Date(rango.hasta).getTime() - new Date(rango.desde).getTime()) / 86400000;
    const granularidad: 'dia' | 'mes' | 'anio' = diasSpan <= 31 ? 'dia' : diasSpan <= 730 ? 'mes' : 'anio';

    const grupos = new Map<string, Punto>();
    for (const op of operacionesVisibles) {
      const clave =
        granularidad === 'dia' ? op.created_at.slice(0, 10) : granularidad === 'mes' ? op.created_at.slice(0, 7) : op.created_at.slice(0, 4);
      const etiqueta = granularidad === 'dia' ? clave.slice(5) : clave;
      const actual = grupos.get(clave) ?? { etiqueta, nOps: 0, monto: 0 };
      actual.nOps += 1;
      actual.monto += op.monto_pen;
      grupos.set(clave, actual);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, p]) => p);
  }, [operacionesVisibles, rango]);

  const totales = useMemo(() => {
    const montoTotal = operacionesVisibles.reduce((acc, o) => acc + o.monto_pen, 0);
    return { nOps: operacionesVisibles.length, montoTotal, ganancia: montoTotal * (rentabilidadPct / 100) };
  }, [operacionesVisibles, rentabilidadPct]);

  const exportarPdf = async () => {
    if (!rango) return;
    setGenerandoPdf(true);
    try {
      const filas = operacionesVisibles
        .map(
          (o) => `<tr>
            <td>${new Date(o.created_at).toLocaleDateString('es-PE')}</td>
            <td>${o.beneficiario_nombre}</td>
            <td>${o.operador_peru_atiende ?? '—'}</td>
            <td>S/ ${o.monto_pen.toFixed(2)}</td>
            <td>Bs ${o.monto_ves.toFixed(2)}</td>
            ${puedeVerGanancia ? `<td>S/ ${(o.monto_pen * (rentabilidadPct / 100)).toFixed(2)}</td>` : ''}
          </tr>`
        )
        .join('');

      await generarYCompartirPdf(
        'Estadísticas de operaciones',
        `Período: ${rango.etiqueta}${soloMisClientes ? ' — solo mis clientes' : ''}`,
        `
          <div class="resumen">
            <div class="resumen-item"><div class="resumen-label">Operaciones</div><div class="resumen-valor">${totales.nOps}</div></div>
            <div class="resumen-item"><div class="resumen-label">Monto recibido</div><div class="resumen-valor">S/ ${totales.montoTotal.toFixed(2)}</div></div>
            ${puedeVerGanancia ? `<div class="resumen-item"><div class="resumen-label">Ganancia</div><div class="resumen-valor">S/ ${totales.ganancia.toFixed(2)}</div></div>` : ''}
          </div>
          <table>
            <thead><tr><th>Fecha</th><th>Beneficiario</th><th>Operador de Perú</th><th>Monto</th><th>Recibido (Bs)</th>${puedeVerGanancia ? '<th>Ganancia</th>' : ''}</tr></thead>
            <tbody>${filas || '<tr><td colspan="6">Sin operaciones en este período.</td></tr>'}</tbody>
          </table>
        `
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Listado completo del detalle -- fecha/hora en que se generó la
  // solicitud y fecha/hora en que se le dio atención (se completó el
  // depósito en Venezuela), además de todos los demás datos.
  const exportarExcelDetalle = async () => {
    setExportandoExcel(true);
    try {
      const filas = operacionesVisibles.map((o) => ({
        'Fecha y hora generada': new Date(o.created_at).toLocaleString('es-PE'),
        'Fecha y hora atendida': o.check_deposito_ve_at ? new Date(o.check_deposito_ve_at).toLocaleString('es-PE') : '',
        Beneficiario: o.beneficiario_nombre,
        'C.I.': o.beneficiario_ci ?? '',
        'Entidad bancaria': o.beneficiario_banco,
        'N° cuenta': o.beneficiario_cuenta,
        'Operador de Perú que atiende': o.operador_peru_atiende ?? '',
        'Monto (S/)': o.monto_pen,
        'Recibe (Bs)': o.monto_ves,
        ...(puedeVerGanancia ? { 'Ganancia (S/)': +(o.monto_pen * (rentabilidadPct / 100)).toFixed(2) } : {}),
        'Validó en Perú': o.validador_peru_nombre ?? '',
        'Validó en Venezuela': o.validador_ve_nombre ?? '',
      }));
      await generarYCompartirExcel('detalle-operaciones', 'Operaciones', filas);
    } finally {
      setExportandoExcel(false);
    }
  };

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.container} style={SIN_OVERSCROLL_Y}>
      <Text style={styles.titulo}>Estadísticas de operaciones</Text>
      <DateRangeFilter onCambio={buscar} />

      {esDuenio && (
        <View style={styles.misClientesFila}>
          <Pressable style={[styles.misClientesChip, soloMisClientes && styles.misClientesChipActivo]} onPress={() => setSoloMisClientes((v) => !v)}>
            <Text style={[styles.misClientesChipTexto, soloMisClientes && styles.misClientesChipTextoActivo]}>Mis clientes</Text>
          </Pressable>
          <Text style={styles.misClientesAyuda}>Ver solo las operaciones de los clientes que atendió el Operador principal de Perú.</Text>
        </View>
      )}

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}

      {!cargando && buscado && rango && (
        <>
          <View style={[styles.resumen, cardShadow]}>
            <Text style={styles.resumenPeriodo}>
              {rango.etiqueta}
              {esHoy ? ' (hoy)' : ''}
            </Text>
            <View style={styles.resumenFila}>
              <ResumenItem label="Operaciones" valor={String(totales.nOps)} />
              <ResumenItem label="Monto" valor={`S/ ${totales.montoTotal.toFixed(2)}`} />
              {puedeVerGanancia && <ResumenItem label="% Rentabilidad" valor={`${rentabilidadPct}%`} />}
              {puedeVerGanancia && <ResumenItem label="Ganancia" valor={`S/ ${totales.ganancia.toFixed(2)}`} destacado />}
            </View>
          </View>

          {puntos.length > 1 && <EstadisticaGraficos puntos={puntos} tituloBase="Monto vs. período (S/)" />}

          {operacionesVisibles.length > 0 && (
            <View style={[styles.card, cardShadow]}>
              <Pressable style={styles.detalleHeader} onPress={() => setDetalleAbierto((v) => !v)}>
                <Text style={styles.chartTitulo}>Detalle de operaciones ({operacionesVisibles.length})</Text>
                <Text style={styles.detalleChevron}>{detalleAbierto ? '▲' : '▼'}</Text>
              </Pressable>
              {detalleAbierto && (
                <>
                  {operacionesVisibles.map((o) => (
                    <View key={o.id} style={styles.detalleFila}>
                      <Text style={styles.detalleBeneficiario} numberOfLines={1}>
                        {o.beneficiario_nombre}
                      </Text>
                      <Text style={styles.detalleDato}>Generada: {new Date(o.created_at).toLocaleString('es-PE')}</Text>
                      <Text style={styles.detalleDato}>
                        Atendida: {o.check_deposito_ve_at ? new Date(o.check_deposito_ve_at).toLocaleString('es-PE') : '—'}
                      </Text>
                      <Text style={styles.detalleDato}>
                        S/ {o.monto_pen.toFixed(2)} · Bs {o.monto_ves.toFixed(2)} · {o.beneficiario_banco} · {o.beneficiario_cuenta}
                      </Text>
                      <Text style={styles.detalleDato}>Operador de Perú: {o.operador_peru_atiende ?? '—'}</Text>
                      {puedeVerGanancia && (
                        <Text style={styles.detalleDato}>Ganancia: S/ {(o.monto_pen * (rentabilidadPct / 100)).toFixed(2)}</Text>
                      )}
                    </View>
                  ))}
                  <Pressable style={styles.excelDetalleBtn} onPress={exportarExcelDetalle} disabled={exportandoExcel}>
                    {exportandoExcel ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.excelDetalleBtnTexto}>Descargar detalle (Excel)</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}

          {esDuenio && operacionesVisibles.length > 0 && (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.chartTitulo}>Por miembro del equipo</Text>
              <Text style={styles.desgloseSubtitulo}>Operador Perú (validó el depósito en Perú)</Text>
              {desglosePeru.map((d) => (
                <View key={d.nombre} style={styles.desgloseFila}>
                  <Text style={styles.desgloseNombre} numberOfLines={1}>
                    {d.nombre}
                  </Text>
                  <Text style={styles.desgloseValor}>
                    {d.nOps} op. · S/ {d.monto.toFixed(2)}
                  </Text>
                </View>
              ))}
              <Text style={[styles.desgloseSubtitulo, styles.desgloseSubtituloVe]}>Operador Venezuela (validó el depósito en VE)</Text>
              {desgloseVe.map((d) => (
                <View key={d.nombre} style={styles.desgloseFila}>
                  <Text style={styles.desgloseNombre} numberOfLines={1}>
                    {d.nombre}
                  </Text>
                  <Text style={styles.desgloseValor}>
                    {d.nOps} op. · S/ {d.monto.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.pdfBtn} onPress={exportarPdf} disabled={generandoPdf}>
            {generandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>Descargar PDF</Text>}
          </Pressable>

          {operacionesVisibles.length === 0 && <Text style={styles.vacio}>No hay operaciones completadas en ese período.</Text>}
        </>
      )}
    </ScrollView>
  );
}

function ResumenItem({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.resumenLabel}>{label}</Text>
      <Text style={[styles.resumenValor, destacado && { color: colors.accent }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 14, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800' },
  resumen: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  resumenPeriodo: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-around' },
  resumenLabel: { color: colors.textMuted, fontSize: 11 },
  resumenValor: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  chartTitulo: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  detalleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detalleChevron: { color: colors.textMuted, fontSize: 11 },
  detalleFila: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8, gap: 2 },
  detalleBeneficiario: { color: colors.text, fontSize: 13, fontWeight: '700' },
  detalleDato: { color: colors.textMuted, fontSize: 11 },
  excelDetalleBtn: { backgroundColor: colors.success, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  excelDetalleBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  desgloseSubtitulo: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  desgloseSubtituloVe: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  desgloseFila: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  desgloseNombre: { color: colors.text, fontSize: 12, fontWeight: '600', flex: 1 },
  desgloseValor: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  pdfBtnTexto: { color: colors.text, fontWeight: '700' },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  misClientesFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  misClientesChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  misClientesChipActivo: { backgroundColor: colors.accent, borderColor: colors.accent },
  misClientesChipTexto: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  misClientesChipTextoActivo: { color: colors.text },
  misClientesAyuda: { color: colors.textMuted, fontSize: 11, flex: 1 },
});
