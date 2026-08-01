import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { DateRangeFilter } from './DateRangeFilter';
import { EstadisticaGraficos } from './EstadisticaGraficos';
import { generarYCompartirPdf } from '../lib/pdfReporte';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { RangoFecha, calcularRango } from '../lib/dateRange';
import { Solicitud } from '../types/database';
import { calcularGananciaOperacion } from '../lib/tasaCalculo';
import { construirEnlaceWhatsAppGenerico } from '../lib/whatsapp';
import { formatearTiempoRespuesta } from './OperationRow';
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
  /** Teléfono del operador de Perú que atiende (miembro o principal), para el botón de WhatsApp. */
  operador_peru_atiende_telefono: string | null;
  /** Operador Venezuela asignado (vía el miembro de Perú que atiende), null si no se pudo determinar. */
  operador_ve_atiende: string | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  /** Ganancia/comisión calculada para esta operación (null si falta la tasa de adquisición del día en que se hizo). */
  ganancia: ReturnType<typeof calcularGananciaOperacion>;
}

interface DesglosePorMiembro {
  nombre: string;
  nOps: number;
  monto: number;
  comision: number;
}

function agruparPorValidador(
  operaciones: SolicitudConValidadores[],
  campo: 'validador_peru_nombre' | 'validador_ve_nombre',
  comisionDe: (op: SolicitudConValidadores) => number
): DesglosePorMiembro[] {
  const grupos = new Map<string, DesglosePorMiembro>();
  for (const op of operaciones) {
    const nombre = op[campo] ?? 'Sin registrar';
    const actual = grupos.get(nombre) ?? { nombre, nOps: 0, monto: 0, comision: 0 };
    actual.nOps += 1;
    actual.monto += op.monto_pen;
    actual.comision += comisionDe(op);
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
  const [buscado, setBuscado] = useState(false);
  const [soloMisClientes, setSoloMisClientes] = useState(false);
  const [telefonosAbiertos, setTelefonosAbiertos] = useState<Set<string>>(new Set());

  const esHoy = rango !== null && rango.desde === HOY();

  interface MiembroInfo {
    nombre: string;
    telefono: string | null;
    comisionPct: number;
    veId: string | null;
  }
  interface VeInfo {
    nombre: string;
    comisionPct: number;
  }

  // Datos de cada miembro de Perú (nombre, teléfono, % comisión, VE
  // asignado), del principal (teléfono) y de cada Operador Venezuela
  // (nombre, % comisión) -- se usan para calcular la ganancia/comisión de
  // cada operación y para mostrar quién la atendió (+ su WhatsApp).
  const cargarEquipo = async (): Promise<{ miembros: Map<string, MiembroInfo>; ves: Map<string, VeInfo>; principalTelefono: string | null }> => {
    const [{ data: miembrosData }, { data: vesData }, { data: principalData }] = await Promise.all([
      supabase
        .from('operador_peru_miembro')
        .select('id, nombre, telefono, comision_pct, operador_venezuela_id')
        .eq('operador_peru_id', operadorPeruId),
      supabase.from('operador_venezuela_perfil').select('id, nombre, comision_pct').eq('operador_peru_id', operadorPeruId),
      supabase.from('usuarios').select('telefono').eq('id', operadorPeruId).maybeSingle(),
    ]);
    const miembros = new Map<string, MiembroInfo>();
    for (const m of (miembrosData as { id: string; nombre: string; telefono: string | null; comision_pct: number; operador_venezuela_id: string | null }[] | null) ?? [])
      miembros.set(m.id, { nombre: m.nombre, telefono: m.telefono, comisionPct: m.comision_pct, veId: m.operador_venezuela_id });
    const ves = new Map<string, VeInfo>();
    for (const v of (vesData as { id: string; nombre: string; comision_pct: number }[] | null) ?? [])
      ves.set(v.id, { nombre: v.nombre, comisionPct: v.comision_pct });
    return { miembros, ves, principalTelefono: principalData?.telefono ?? null };
  };

  // Trae los datos del rango sin tocar scroll ni el spinner de carga --
  // se usa tanto desde `buscar` (con esos efectos) como desde el refresco
  // silencioso por Realtime, que NO debe interrumpir al usuario si en ese
  // momento está escribiendo en el buscador o leyendo resultados.
  const cargarDatos = async (rangoConsulta: RangoFecha) => {
    const [{ miembros, ves, principalTelefono }, { data: ops }] = await Promise.all([
      cargarEquipo(),
      (() => {
        let query = supabase
          .from('solicitudes')
          .select(
            '*, validador_peru:usuarios!solicitudes_validado_peru_por_fkey(nombre), validador_ve:usuarios!solicitudes_validado_ve_por_fkey(nombre), cliente:usuarios!solicitudes_cliente_id_fkey(nombre, telefono)'
          )
          // "Realizadas" (check_deposito_ve) y "por revisar" (en_revision)
          // quedan disponibles acá aunque ya se hayan borrado de la vista
          // del Panel al cerrar el horario de atención -- nada se pierde.
          .or('check_deposito_ve.eq.true,en_revision.eq.true')
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
    ]);

    setOperaciones(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ops as any[]) ?? []).map((row) => {
        const miembro = row.operador_peru_miembro_id ? miembros.get(row.operador_peru_miembro_id) : null;
        const ve = miembro?.veId ? ves.get(miembro.veId) : null;
        const ganancia = calcularGananciaOperacion(
          row.monto_pen,
          row.tasa_pen_ves,
          row.tasa_real_compra,
          (miembro?.comisionPct ?? 0) / 100,
          (ve?.comisionPct ?? 0) / 100
        );
        return {
          ...row,
          validador_peru_nombre: row.validador_peru?.nombre ?? null,
          validador_ve_nombre: row.validador_ve?.nombre ?? null,
          cliente_nombre: row.cliente?.nombre ?? 'Cliente',
          cliente_telefono: row.cliente?.telefono ?? null,
          operador_peru_atiende: miembro?.nombre ?? 'Operador principal de Perú',
          operador_peru_atiende_telefono: miembro ? miembro.telefono : principalTelefono,
          operador_ve_atiende: ve?.nombre ?? null,
          ganancia,
        };
      })
    );
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

  const desglosePeru = useMemo(
    () => agruparPorValidador(operacionesVisibles, 'validador_peru_nombre', (o) => o.ganancia?.comisionPeruPen ?? 0),
    [operacionesVisibles]
  );
  const desgloseVe = useMemo(
    () => agruparPorValidador(operacionesVisibles, 'validador_ve_nombre', (o) => o.ganancia?.comisionVenezuelaPen ?? 0),
    [operacionesVisibles]
  );

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

  // "Ganancia total" (bruta) es visible para todos los roles -- es
  // informativa del negocio. La Ganancia Neta (lo que le queda al
  // principal después de pagar comisiones) SOLO la ve el dueño.
  const totales = useMemo(() => {
    const montoTotalPen = operacionesVisibles.reduce((acc, o) => acc + o.monto_pen, 0);
    const montoTotalVes = operacionesVisibles.reduce((acc, o) => acc + o.monto_ves, 0);
    const gananciaBrutaTotal = operacionesVisibles.reduce((acc, o) => acc + (o.ganancia?.gananciaBrutaPen ?? 0), 0);
    const gananciaNetaTotal = operacionesVisibles.reduce((acc, o) => acc + (o.ganancia?.gananciaNetaPen ?? 0), 0);
    return {
      nOps: operacionesVisibles.length,
      montoTotalPen,
      montoTotalVes,
      gananciaBrutaTotal,
      gananciaNetaTotal,
    };
  }, [operacionesVisibles]);

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
            <td>${o.operador_ve_atiende ?? '—'}</td>
            <td>PEN ${o.monto_pen.toFixed(2)}</td>
            <td>VES ${o.monto_ves.toFixed(2)}</td>
            <td>PEN ${(o.ganancia?.gananciaBrutaPen ?? 0).toFixed(2)}</td>
            ${esDuenio ? `<td>PEN ${(o.ganancia?.gananciaNetaPen ?? 0).toFixed(2)}</td>` : ''}
          </tr>`
        )
        .join('');

      await generarYCompartirPdf(
        'Estadísticas de operaciones',
        `Período: ${rango.etiqueta}${soloMisClientes ? ' — solo mis clientes' : ''}`,
        `
          <div class="resumen">
            <div class="resumen-item"><div class="resumen-label">Operaciones</div><div class="resumen-valor">${totales.nOps}</div></div>
            <div class="resumen-item"><div class="resumen-label">Monto recibido</div><div class="resumen-valor">PEN ${totales.montoTotalPen.toFixed(2)}</div></div>
            <div class="resumen-item"><div class="resumen-label">Enviado a Venezuela</div><div class="resumen-valor">VES ${totales.montoTotalVes.toFixed(2)}</div></div>
            <div class="resumen-item"><div class="resumen-label">Ganancia total</div><div class="resumen-valor">PEN ${totales.gananciaBrutaTotal.toFixed(2)}</div></div>
            ${esDuenio ? `<div class="resumen-item"><div class="resumen-label">Ganancia Neta</div><div class="resumen-valor">PEN ${totales.gananciaNetaTotal.toFixed(2)}</div></div>` : ''}
          </div>
          <table>
            <thead><tr><th>Fecha</th><th>Beneficiario</th><th>Operador de Perú</th><th>Operador Venezuela</th><th>Monto</th><th>Recibido (VES)</th><th>Ganancia</th>${esDuenio ? '<th>Ganancia Neta</th>' : ''}</tr></thead>
            <tbody>${filas || '<tr><td colspan="8">Sin operaciones en este período.</td></tr>'}</tbody>
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
        Cliente: o.cliente_nombre,
        Beneficiario: o.beneficiario_nombre,
        'C.I.': o.beneficiario_ci ?? '',
        'Entidad bancaria': o.beneficiario_banco,
        'N° cuenta': o.beneficiario_cuenta,
        'Operador de Perú que atiende': o.operador_peru_atiende ?? '',
        'Operador Venezuela': o.operador_ve_atiende ?? '',
        'Monto (PEN)': o.monto_pen,
        'Recibe (VES)': o.monto_ves,
        'Comisión Perú (PEN)': o.ganancia?.comisionPeruPen ?? 0,
        'Comisión Venezuela (VES)': o.ganancia?.comisionVenezuelaVes ?? 0,
        'Ganancia bruta (PEN)': o.ganancia?.gananciaBrutaPen ?? 0,
        ...(esDuenio ? { 'Ganancia neta (PEN)': o.ganancia?.gananciaNetaPen ?? 0 } : {}),
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
              <ResumenItem label="Monto" valor={`PEN ${totales.montoTotalPen.toFixed(2)}`} />
              <ResumenItem label="Enviado a Venezuela" valor={`VES ${totales.montoTotalVes.toFixed(2)}`} />
              <ResumenItem label="Ganancia total" valor={`PEN ${totales.gananciaBrutaTotal.toFixed(2)}`} />
              {esDuenio && <ResumenItem label="Ganancia Neta" valor={`PEN ${totales.gananciaNetaTotal.toFixed(2)}`} destacado />}
            </View>
          </View>

          {puntos.length > 1 && <EstadisticaGraficos puntos={puntos} tituloBase="Monto vs. período (PEN)" />}

          {operacionesVisibles.length > 0 && (
            <View style={[styles.card, cardShadow]}>
              <Pressable style={styles.detalleHeader} onPress={() => setDetalleAbierto((v) => !v)}>
                <Text style={styles.chartTitulo}>Detalle de operaciones ({operacionesVisibles.length})</Text>
                <Text style={styles.detalleChevron}>{detalleAbierto ? '▲' : '▼'}</Text>
              </Pressable>
              {detalleAbierto && (
                <>
                  {operacionesVisibles.map((o) => {
                    const telefonosVisibles = telefonosAbiertos.has(o.id);
                    const waCliente = construirEnlaceWhatsAppGenerico(o.cliente_telefono, `Hola ${o.cliente_nombre}, te escribo por tu remesa.`);
                    const waBeneficiario = construirEnlaceWhatsAppGenerico(
                      o.beneficiario_telefono,
                      `Hola ${o.beneficiario_nombre}, te escribo por tu remesa.`
                    );
                    const waOperadorPeru = construirEnlaceWhatsAppGenerico(
                      o.operador_peru_atiende_telefono,
                      `Hola ${o.operador_peru_atiende ?? ''}, te escribo por una remesa.`
                    );
                    return (
                      <View key={o.id} style={styles.detalleFila}>
                        <Text style={styles.detalleBeneficiario} numberOfLines={1}>
                          Cliente: {o.cliente_nombre} → Beneficiario: {o.beneficiario_nombre}
                        </Text>
                        <Text style={styles.detalleDato}>Generada: {new Date(o.created_at).toLocaleString('es-PE')}</Text>
                        <Text style={styles.detalleDato}>
                          Atendida: {o.check_deposito_ve_at ? new Date(o.check_deposito_ve_at).toLocaleString('es-PE') : '—'}
                        </Text>
                        {o.check_deposito_ve_at && (
                          <Text style={styles.detalleDato}>Tiempo de respuesta total: {formatearTiempoRespuesta(o.created_at, o.check_deposito_ve_at)}</Text>
                        )}
                        <Text style={styles.detalleDato}>
                          PEN {o.monto_pen.toFixed(2)} · VES {o.monto_ves.toFixed(2)} · {o.beneficiario_banco} · {o.beneficiario_cuenta}
                        </Text>
                        <View style={styles.operadorFila}>
                          <Text style={styles.detalleDato}>Operador de Perú: {o.operador_peru_atiende ?? '—'}</Text>
                          {waOperadorPeru && (
                            <Pressable onPress={() => Linking.openURL(waOperadorPeru)}>
                              <Text style={styles.telefonoLink}>WhatsApp</Text>
                            </Pressable>
                          )}
                        </View>
                        <Text style={styles.detalleDato}>Operador Venezuela: {o.operador_ve_atiende ?? '—'}</Text>
                        {o.ganancia && (
                          <>
                            <Text style={styles.detalleDato}>
                              Comisión Perú ({o.operador_peru_atiende ?? '—'}): PEN {o.ganancia.comisionPeruPen.toFixed(2)}
                            </Text>
                            <Text style={styles.detalleDato}>
                              Comisión Venezuela ({o.operador_ve_atiende ?? '—'}): VES {o.ganancia.comisionVenezuelaVes.toFixed(2)} · PEN{' '}
                              {o.ganancia.comisionVenezuelaPen.toFixed(2)}
                            </Text>
                            <Text style={styles.detalleDato}>Ganancia: PEN {o.ganancia.gananciaBrutaPen.toFixed(2)}</Text>
                            {esDuenio && <Text style={styles.detalleDato}>Ganancia Neta: PEN {o.ganancia.gananciaNetaPen.toFixed(2)}</Text>}
                          </>
                        )}
                        <Pressable
                          onPress={() =>
                            setTelefonosAbiertos((prev) => {
                              const next = new Set(prev);
                              if (next.has(o.id)) next.delete(o.id);
                              else next.add(o.id);
                              return next;
                            })
                          }
                        >
                          <Text style={styles.telefonosToggle}>{telefonosVisibles ? '▲ Ocultar teléfonos' : '▼ Ver teléfonos (WhatsApp)'}</Text>
                        </Pressable>
                        {telefonosVisibles && (
                          <View style={styles.telefonosBloque}>
                            <Pressable disabled={!waCliente} onPress={() => waCliente && Linking.openURL(waCliente)}>
                              <Text style={styles.telefonoLink}>
                                Cliente ({o.cliente_nombre}): {o.cliente_telefono ?? 'sin teléfono'}
                              </Text>
                            </Pressable>
                            <Pressable disabled={!waBeneficiario} onPress={() => waBeneficiario && Linking.openURL(waBeneficiario)}>
                              <Text style={styles.telefonoLink}>
                                Beneficiario ({o.beneficiario_nombre}): {o.beneficiario_telefono ?? 'sin teléfono'}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
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
              <Text style={styles.chartTitulo}>Por operador — clasificado por Perú y Venezuela</Text>
              <Text style={styles.desgloseSubtitulo}>Operadores de Perú</Text>
              {desglosePeru.map((d) => (
                <View key={d.nombre} style={styles.desgloseFila}>
                  <Text style={styles.desgloseNombre} numberOfLines={1}>
                    {d.nombre}
                  </Text>
                  <Text style={styles.desgloseValor}>
                    {d.nOps} op. · PEN {d.monto.toFixed(2)} · comisión PEN {d.comision.toFixed(2)}
                  </Text>
                </View>
              ))}
              <Text style={[styles.desgloseSubtitulo, styles.desgloseSubtituloVe]}>Operadores de Venezuela</Text>
              {desgloseVe.map((d) => (
                <View key={d.nombre} style={styles.desgloseFila}>
                  <Text style={styles.desgloseNombre} numberOfLines={1}>
                    {d.nombre}
                  </Text>
                  <Text style={styles.desgloseValor}>
                    {d.nOps} op. · PEN {d.monto.toFixed(2)} · comisión PEN {d.comision.toFixed(2)}
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
    <View style={styles.resumenItemBox}>
      <Text style={styles.resumenLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.resumenValor, destacado && { color: colors.accent }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 14, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 23, fontWeight: '800' },
  resumen: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  resumenPeriodo: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  resumenFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  resumenItemBox: { alignItems: 'center', minWidth: 90, flexGrow: 1 },
  resumenLabel: { color: colors.textMuted, fontSize: 13 },
  resumenValor: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  chartTitulo: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  detalleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detalleChevron: { color: colors.textMuted, fontSize: 13 },
  detalleFila: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8, gap: 2 },
  detalleBeneficiario: { color: colors.text, fontSize: 15, fontWeight: '700' },
  detalleDato: { color: colors.textMuted, fontSize: 13 },
  operadorFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  telefonosToggle: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 4 },
  telefonosBloque: { gap: 4, marginTop: 4 },
  telefonoLink: { color: colors.success, fontSize: 13, fontWeight: '600' },
  excelDetalleBtn: { backgroundColor: colors.success, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  excelDetalleBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  desgloseSubtitulo: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  desgloseSubtituloVe: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  desgloseFila: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  desgloseNombre: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, minWidth: 80 },
  desgloseValor: { color: colors.accent, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  pdfBtnTexto: { color: colors.text, fontWeight: '700' },
  vacio: { color: colors.textMuted, fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
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
  misClientesChipTexto: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  misClientesChipTextoActivo: { color: colors.text },
  misClientesAyuda: { color: colors.textMuted, fontSize: 13, flex: 1 },
});
