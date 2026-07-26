import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { generarYCompartirPdf } from '../../lib/pdfReporte';
import { RangoFecha } from '../../lib/dateRange';
import { PerfilNegocio, Solicitud } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

interface Punto {
  etiqueta: string;
  nOps: number;
  monto: number;
}

export default function EstadisticasOperador() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [rango, setRango] = useState<RangoFecha | null>(null);
  const [operaciones, setOperaciones] = useState<Solicitud[]>([]);
  const [rentabilidadPct, setRentabilidadPct] = useState(0);
  const [buscado, setBuscado] = useState(false);

  const buscar = async (nuevoRango: RangoFecha | null) => {
    setRango(nuevoRango);
    if (!nuevoRango || !usuario) return;
    setCargando(true);
    setBuscado(true);

    const [{ data: ops }, { data: perfil }] = await Promise.all([
      supabase
        .from('solicitudes')
        .select('*')
        .eq('check_deposito_ve', true)
        .eq('negocio_operador_peru_id', usuario.id)
        .gte('created_at', nuevoRango.desde)
        .lt('created_at', nuevoRango.hasta)
        .order('created_at', { ascending: true }),
      supabase.from('perfil_negocio').select('*').eq('operador_peru_id', usuario.id).maybeSingle(),
    ]);

    setOperaciones((ops as Solicitud[] | null) ?? []);
    setRentabilidadPct((perfil as PerfilNegocio | null)?.rentabilidad_pct ?? 0);
    setCargando(false);
  };

  // La granularidad del gráfico se adapta al tamaño del rango elegido: por
  // día si es corto (fecha específica o pocos días), por mes si abarca
  // varios meses, y por año si abarca varios años — así "por año" no
  // termina mostrando cientos de barras diarias.
  const puntos = useMemo<Punto[]>(() => {
    if (!rango) return [];
    const diasSpan = (new Date(rango.hasta).getTime() - new Date(rango.desde).getTime()) / 86400000;
    const granularidad: 'dia' | 'mes' | 'anio' = diasSpan <= 31 ? 'dia' : diasSpan <= 730 ? 'mes' : 'anio';

    const grupos = new Map<string, Punto>();
    for (const op of operaciones) {
      const clave =
        granularidad === 'dia' ? op.created_at.slice(0, 10) : granularidad === 'mes' ? op.created_at.slice(0, 7) : op.created_at.slice(0, 4);
      const etiqueta = granularidad === 'dia' ? clave.slice(5) : clave;
      const actual = grupos.get(clave) ?? { etiqueta, nOps: 0, monto: 0 };
      actual.nOps += 1;
      actual.monto += op.monto_pen;
      grupos.set(clave, actual);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, p]) => p);
  }, [operaciones, rango]);

  const totales = useMemo(() => {
    const montoTotal = operaciones.reduce((acc, o) => acc + o.monto_pen, 0);
    return { nOps: operaciones.length, montoTotal, ganancia: montoTotal * (rentabilidadPct / 100) };
  }, [operaciones, rentabilidadPct]);

  const exportarPdf = async () => {
    if (!rango) return;
    setGenerandoPdf(true);
    try {
      const filas = operaciones
        .map(
          (o) => `<tr>
            <td>${new Date(o.created_at).toLocaleDateString('es-PE')}</td>
            <td>${o.beneficiario_nombre}</td>
            <td>S/ ${o.monto_pen.toFixed(2)}</td>
            <td>Bs ${o.monto_ves.toFixed(2)}</td>
          </tr>`
        )
        .join('');

      await generarYCompartirPdf(
        'Estadísticas de operaciones',
        `Período: ${rango.etiqueta}`,
        `
          <div class="resumen">
            <div class="resumen-item"><div class="resumen-label">Operaciones</div><div class="resumen-valor">${totales.nOps}</div></div>
            <div class="resumen-item"><div class="resumen-label">Monto recibido</div><div class="resumen-valor">S/ ${totales.montoTotal.toFixed(2)}</div></div>
            <div class="resumen-item"><div class="resumen-label">Ganancia</div><div class="resumen-valor">S/ ${totales.ganancia.toFixed(2)}</div></div>
          </div>
          <table>
            <thead><tr><th>Fecha</th><th>Beneficiario</th><th>Monto</th><th>Recibido (Bs)</th></tr></thead>
            <tbody>${filas || '<tr><td colspan="4">Sin operaciones en este período.</td></tr>'}</tbody>
          </table>
        `
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Estadísticas de operaciones</Text>
      <DateRangeFilter onCambio={buscar} />

      {cargando && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}

      {!cargando && buscado && rango && (
        <>
          <View style={[styles.resumen, cardShadow]}>
            <Text style={styles.resumenPeriodo}>{rango.etiqueta}</Text>
            <View style={styles.resumenFila}>
              <ResumenItem label="Operaciones" valor={String(totales.nOps)} />
              <ResumenItem label="Monto" valor={`S/ ${totales.montoTotal.toFixed(2)}`} />
              <ResumenItem label="Ganancia" valor={`S/ ${totales.ganancia.toFixed(2)}`} destacado />
            </View>
          </View>

          {puntos.length > 1 && (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.chartTitulo}>Monto vs. período (S/)</Text>
              <BarChart
                data={puntos.map((p) => ({ value: Math.round(p.monto), label: p.etiqueta }))}
                barWidth={22}
                spacing={16}
                roundedTop
                frontColor={colors.primary}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                noOfSections={4}
                hideRules
              />
            </View>
          )}

          <Pressable style={styles.pdfBtn} onPress={exportarPdf} disabled={generandoPdf}>
            {generandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>Descargar PDF</Text>}
          </Pressable>

          {operaciones.length === 0 && <Text style={styles.vacio}>No hay operaciones completadas en ese período.</Text>}
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
  chartTitulo: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 12 },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  pdfBtnTexto: { color: colors.text, fontWeight: '700' },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
});
