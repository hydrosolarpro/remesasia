import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCorredor, banderaCorredor, CorredorId } from '../lib/corredor';
import { colors, radius } from '../constants/theme';

// Ingresos por corredor del negocio (solo Operador principal), todo
// totalizado en dólares: cada solicitud completada trae su equivalente en
// USD al cambio BCV del momento (solicitudes.monto_usd_bcv). Muestra barras
// horizontales por corredor (monto + operaciones) y barras verticales con
// monto, nº de operaciones y % sobre el total de todos los corredores.
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
  monto: number;
  ops: number;
}

// En pantallas angostas (celular) el monto de las barras verticales va abreviado: US$ 5.3k.
const usdCorto = (n: number) =>
  n >= 1_000_000 ? `US$ ${(n / 1_000_000).toFixed(2)}M` : n >= 10_000 ? `US$ ${(n / 1000).toFixed(1)}k` : usd(n);

const usd = (n: number) => `US$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    const acum = new Map<string, Fila>();
    // RLS limita las solicitudes al negocio del principal; se pagina para pasar el tope de 1000 filas.
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error: err } = await supabase
        .from('solicitudes')
        .select('corredor, monto_usd_bcv')
        .eq('estado', 'COMPLETADA')
        .order('created_at', { ascending: true })
        .range(desde, desde + PAGINA - 1);
      if (err) {
        setError(true);
        setFilas([]);
        return;
      }
      for (const r of (data ?? []) as { corredor: string | null; monto_usd_bcv: number | null }[]) {
        const id = r.corredor ?? 'PE-VE';
        const f = acum.get(id) ?? { id, monto: 0, ops: 0 };
        f.monto += Number(r.monto_usd_bcv ?? 0);
        f.ops += 1;
        acum.set(id, f);
      }
      if (!data || data.length < PAGINA) break;
    }
    setFilas([...acum.values()].sort((a, b) => b.monto - a.monto));
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = useMemo(() => {
    const f = filas ?? [];
    return { monto: f.reduce((s, x) => s + x.monto, 0), ops: f.reduce((s, x) => s + x.ops, 0) };
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

  const maximo = Math.max(...filas.map((f) => f.monto), 1);
  const color = (id: string) => PALETA[id] ?? colors.accent;
  const pct = (m: number) => (total.monto > 0 ? (m / total.monto) * 100 : 0);

  return (
    <View style={styles.wrap}>
      <Text style={styles.nota}>
        Operaciones completadas, convertidas a dólares (USD) al cambio BCV de cada operación.
      </Text>

      {/* Barras horizontales: una por corredor */}
      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Ingresos por corredor</Text>
        {filas.map((f) => {
          const c = configDe(f.id);
          return (
            <View key={f.id} style={styles.hFila}>
              <View style={[styles.hCabecera, estrecho && styles.hCabeceraCel]}>
                <Text style={styles.hNombre} numberOfLines={1}>
                  {banderaCorredor(f.id as CorredorId)} {c.etiqueta}
                </Text>
                <Text style={styles.hMonto}>
                  {usd(f.monto)} · {f.ops} {f.ops === 1 ? 'operación' : 'operaciones'}
                </Text>
              </View>
              <View style={styles.hPista}>
                <View style={[styles.hBarra, { width: `${Math.max((f.monto / maximo) * 100, 1.5)}%`, backgroundColor: color(f.id) }]} />
              </View>
            </View>
          );
        })}
        <View style={styles.totalFila}>
          <Text style={styles.totalTexto}>TOTAL TODOS LOS CORREDORES</Text>
          <Text style={[styles.totalMonto, estrecho && { fontSize: 16 }]}>
            {usd(total.monto)} · {total.ops} {total.ops === 1 ? 'operación' : 'operaciones'}
          </Text>
        </View>
      </View>

      {/* Barras verticales: monto, operaciones y % */}
      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Comparativo en dólares</Text>
        <View style={[styles.vGrafico, estrecho && styles.vGraficoCel]}>
          {filas.map((f) => {
            const c = configDe(f.id);
            const alto = Math.max((f.monto / maximo) * ALTO_BARRA, 4);
            return (
              <View key={f.id} style={styles.vColumna}>
                <Text style={[styles.vMonto, estrecho && styles.vMontoCel]} numberOfLines={1} adjustsFontSizeToFit>
                  {estrecho ? usdCorto(f.monto) : usd(f.monto)}
                </Text>
                <View style={[styles.vBarra, estrecho && styles.vBarraCel, { height: alto, backgroundColor: color(f.id) }]} />
                <Text style={styles.vPct}>{pct(f.monto).toFixed(1)}%</Text>
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
  bloque: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 12, gap: 10 },
  subtitulo: { color: colors.text, fontSize: 14, fontWeight: '800' },

  hFila: { gap: 6 },
  hCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  hCabeceraCel: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  hNombre: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  hMonto: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
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
