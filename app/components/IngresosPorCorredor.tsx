import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCorredor, banderaCorredor, CorredorId } from '../lib/corredor';
import { calcularGananciaOperacion } from '../lib/tasaCalculo';
import { colors, radius } from '../constants/theme';

// Ganancia NETA del dueño del negocio (Operador principal) por corredor,
// totalizada en dólares. Por operación completada: ganancia neta = ganancia
// bruta - comisión del operador de Perú - comisión del operador de
// Venezuela (misma fórmula de Estadísticas: calcularGananciaOperacion, con
// los % congelados en la operación). Se pasa a USD con la equivalencia de la
// propia operación (monto_usd_bcv ÷ monto), así no depende de otro cambio.
// Las operaciones sin la tasa de compra del día no se pueden calcular y se
// avisan aparte.
const PALETA: Record<string, string> = {
  'PE-VE': '#6C5CE7',
  'CO-VE': '#FBBF24',
  'CL-VE': '#FB4E70',
  'OT-VE': '#22D3C4',
};
const ALTO_BARRA = 150;
const PAGINA = 1000;

interface Fila {
  id: string;
  /** Ganancia neta del principal en USD. */
  neto: number;
  /** Monto movido (volumen) en USD, referencia. */
  movido: number;
  ops: number;
  sinCalculo: number;
}

const usd = (n: number) => `US$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// En pantallas angostas (celular) el monto de las barras verticales va abreviado: US$ 5.3k.
const usdCorto = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `US$ ${(n / 1_000_000).toFixed(2)}M` : Math.abs(n) >= 10_000 ? `US$ ${(n / 1000).toFixed(1)}k` : usd(n);

interface FilaSolicitud {
  corredor: string | null;
  monto_pen: number;
  monto_usd_bcv: number | null;
  tasa_pen_ves: number;
  tasa_real_compra: number | null;
  comision_peru_pct_aplicada: number | null;
  comision_venezuela_pct_aplicada: number | null;
  operador_peru_miembro_id: string | null;
  derivada_ve_perfil_id: string | null;
}

export function IngresosPorCorredor() {
  const { usuario } = useAuth();
  const { configDe } = useCorredor();
  const { width } = useWindowDimensions();
  const estrecho = width < 560;
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setError(false);

    // % de comisión de cada operador (por si la operación no trae el % congelado).
    const [{ data: miembrosData }, { data: vesData }, { data: comData }] = await Promise.all([
      supabase.from('operador_peru_miembro').select('id, comision_pct, operador_venezuela_id').eq('operador_peru_id', usuario.id),
      supabase.from('operador_venezuela_perfil').select('id, comision_pct').eq('operador_peru_id', usuario.id),
      supabase.from('comisiones_corredor').select('tipo, operador_id, corredor, comision_pct'),
    ]);
    const miembros = new Map<string, { pct: number; veId: string | null }>();
    for (const m of (miembrosData as { id: string; comision_pct: number; operador_venezuela_id: string | null }[] | null) ?? [])
      miembros.set(m.id, { pct: Number(m.comision_pct ?? 0), veId: m.operador_venezuela_id });
    const ves = new Map<string, number>();
    for (const v of (vesData as { id: string; comision_pct: number }[] | null) ?? []) ves.set(v.id, Number(v.comision_pct ?? 0));
    const porCorredor = new Map<string, number>();
    for (const c of (comData as { tipo: string; operador_id: string; corredor: string; comision_pct: number }[] | null) ?? [])
      porCorredor.set(`${c.tipo}|${c.operador_id}|${c.corredor}`, Number(c.comision_pct));

    const acum = new Map<string, Fila>();
    // RLS limita las solicitudes al negocio del principal; se pagina para pasar el tope de 1000 filas.
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error: err } = await supabase
        .from('solicitudes')
        .select(
          'corredor, monto_pen, monto_usd_bcv, tasa_pen_ves, tasa_real_compra, comision_peru_pct_aplicada, comision_venezuela_pct_aplicada, operador_peru_miembro_id, derivada_ve_perfil_id'
        )
        .eq('estado', 'COMPLETADA')
        .order('created_at', { ascending: true })
        .range(desde, desde + PAGINA - 1);
      if (err) {
        setError(true);
        setFilas([]);
        return;
      }
      for (const r of (data ?? []) as FilaSolicitud[]) {
        const id = r.corredor ?? 'PE-VE';
        const f = acum.get(id) ?? { id, neto: 0, movido: 0, ops: 0, sinCalculo: 0 };
        const miembro = r.operador_peru_miembro_id ? miembros.get(r.operador_peru_miembro_id) : undefined;
        const veId = r.derivada_ve_perfil_id ?? miembro?.veId ?? null;
        const pctPeru =
          r.comision_peru_pct_aplicada ??
          (r.operador_peru_miembro_id ? porCorredor.get(`peru_miembro|${r.operador_peru_miembro_id}|${id}`) : undefined) ??
          miembro?.pct ??
          0;
        const pctVe =
          r.comision_venezuela_pct_aplicada ?? (veId ? porCorredor.get(`venezuela|${veId}|${id}`) : undefined) ?? (veId ? ves.get(veId) : undefined) ?? 0;
        const g = calcularGananciaOperacion(Number(r.monto_pen), Number(r.tasa_pen_ves), r.tasa_real_compra, pctPeru / 100, pctVe / 100);
        const usdPorUnidad = r.monto_pen ? Number(r.monto_usd_bcv ?? 0) / Number(r.monto_pen) : 0;
        f.ops += 1;
        f.movido += Number(r.monto_usd_bcv ?? 0);
        if (g) f.neto += g.gananciaNetaPen * usdPorUnidad;
        else f.sinCalculo += 1;
        acum.set(id, f);
      }
      if (!data || data.length < PAGINA) break;
    }
    setFilas([...acum.values()].sort((a, b) => b.neto - a.neto));
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = useMemo(() => {
    const f = filas ?? [];
    return {
      neto: f.reduce((s, x) => s + x.neto, 0),
      movido: f.reduce((s, x) => s + x.movido, 0),
      ops: f.reduce((s, x) => s + x.ops, 0),
      sinCalculo: f.reduce((s, x) => s + x.sinCalculo, 0),
    };
  }, [filas]);

  if (filas === null) return <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />;
  if (error) {
    return (
      <Pressable onPress={cargar}>
        <Text style={styles.vacio}>No se pudieron cargar los ingresos. Toca para reintentar.</Text>
      </Pressable>
    );
  }
  if (filas.length === 0) return <Text style={styles.vacio}>Todavía no hay operaciones completadas para mostrar.</Text>;

  const maximo = Math.max(...filas.map((f) => f.neto), 1);
  const color = (id: string) => PALETA[id] ?? colors.accent;
  const positivoTotal = filas.reduce((s, x) => s + Math.max(x.neto, 0), 0);
  const pct = (m: number) => (positivoTotal > 0 ? (Math.max(m, 0) / positivoTotal) * 100 : 0);
  const etiquetaOps = (n: number) => `${n} ${n === 1 ? 'operación' : 'operaciones'}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.nota}>
        Tu ganancia neta como Operador principal (después de las comisiones de los operadores), en dólares (USD). Solo operaciones
        completadas.
      </Text>

      {/* Barras horizontales: una por corredor */}
      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Ganancia neta por corredor</Text>
        {filas.map((f) => {
          const c = configDe(f.id);
          return (
            <View key={f.id} style={styles.hFila}>
              <View style={[styles.hCabecera, estrecho && styles.hCabeceraCel]}>
                <Text style={styles.hNombre} numberOfLines={1}>
                  {banderaCorredor(f.id as CorredorId)} {c.etiqueta}
                </Text>
                <Text style={styles.hMonto}>
                  {usd(f.neto)} · {etiquetaOps(f.ops)}
                </Text>
              </View>
              <View style={styles.hPista}>
                <View
                  style={[
                    styles.hBarra,
                    { width: `${Math.max((Math.max(f.neto, 0) / maximo) * 100, 1.5)}%`, backgroundColor: f.neto < 0 ? colors.danger : color(f.id) },
                  ]}
                />
              </View>
              <Text style={styles.hMovido}>Monto movido: {usd(f.movido)}</Text>
            </View>
          );
        })}
        <View style={styles.totalFila}>
          <Text style={styles.totalTexto}>GANANCIA NETA TOTAL · TODOS LOS CORREDORES</Text>
          <Text style={[styles.totalMonto, estrecho && { fontSize: 16 }]}>
            {usd(total.neto)} · {etiquetaOps(total.ops)}
          </Text>
          <Text style={styles.hMovido}>Monto movido total: {usd(total.movido)}</Text>
        </View>
        {total.sinCalculo > 0 && (
          <Text style={styles.aviso}>
            {total.sinCalculo} {total.sinCalculo === 1 ? 'operación no suma' : 'operaciones no suman'} a la ganancia neta porque no tienen la
            tasa de compra del día registrada.
          </Text>
        )}
      </View>

      {/* Barras verticales: ganancia neta, operaciones y % */}
      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Comparativo en dólares</Text>
        <View style={[styles.vGrafico, estrecho && styles.vGraficoCel]}>
          {filas.map((f) => {
            const c = configDe(f.id);
            const alto = Math.max((Math.max(f.neto, 0) / maximo) * ALTO_BARRA, 4);
            return (
              <View key={f.id} style={styles.vColumna}>
                <Text style={[styles.vMonto, estrecho && styles.vMontoCel]} numberOfLines={1} adjustsFontSizeToFit>
                  {estrecho ? usdCorto(f.neto) : usd(f.neto)}
                </Text>
                <View style={[styles.vBarra, estrecho && styles.vBarraCel, { height: alto, backgroundColor: f.neto < 0 ? colors.danger : color(f.id) }]} />
                <Text style={styles.vPct}>{pct(f.neto).toFixed(1)}%</Text>
                <Text style={styles.vOps}>
                  {f.ops} {f.ops === 1 ? 'op.' : 'ops.'}
                </Text>
                <Text style={styles.vNombre} numberOfLines={2}>
                  {banderaCorredor(f.id as CorredorId)} {c.paisRecepcion}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  nota: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  vacio: { color: colors.textMuted, fontSize: 14, paddingVertical: 8 },
  aviso: { color: colors.warning, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  bloque: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 12, gap: 10 },
  subtitulo: { color: colors.text, fontSize: 14, fontWeight: '800' },

  hFila: { gap: 6 },
  hCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  hCabeceraCel: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  hNombre: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  hMonto: { color: colors.text, fontSize: 13, fontWeight: '700' },
  hMovido: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  hPista: { height: 14, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  hBarra: { height: '100%', borderRadius: radius.pill },
  totalFila: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 2 },
  totalTexto: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  totalMonto: { color: colors.success, fontSize: 18, fontWeight: '900' },

  vGrafico: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 8, paddingTop: 4 },
  vGraficoCel: { gap: 4 },
  vMontoCel: { fontSize: 10 },
  vBarraCel: { width: '80%' },
  vColumna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 },
  vMonto: { color: colors.text, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  vBarra: { width: '70%', maxWidth: 64, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  vPct: { color: colors.accent, fontSize: 15, fontWeight: '900' },
  vOps: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  vNombre: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
