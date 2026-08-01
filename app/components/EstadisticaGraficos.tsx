import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { generarYCompartirPdf } from '../lib/pdfReporte';
import { colors, radius } from '../constants/theme';

export interface PuntoGrafico {
  etiqueta: string;
  monto: number;
}

type TipoGrafico = 'barra' | 'circular' | 'linea';

const TIPOS: { valor: TipoGrafico; etiqueta: string }[] = [
  { valor: 'barra', etiqueta: 'Barras' },
  { valor: 'circular', etiqueta: 'Circular' },
  { valor: 'linea', etiqueta: 'Línea' },
];

const PALETA = [colors.primary, colors.accent, colors.warning, colors.success, colors.danger, colors.gradientEnd];

// Espera un par de frames para que React termine de aplicar un cambio de
// estado (p.ej. cambiar el tipo de gráfico) antes de capturarlo -- si se
// captura en el mismo tick, ViewShot todavía ve el gráfico anterior.
function esperarRender() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

// Selector de tipo de gráfico (barras/circular/línea) + descarga en PDF,
// individual (con su título) o de los 3 tipos juntos. Usado tanto por
// Estadísticas del operador como por la del cliente.
export function EstadisticaGraficos({ puntos, tituloBase }: { puntos: PuntoGrafico[]; tituloBase: string }) {
  const [tipo, setTipo] = useState<TipoGrafico>('barra');
  const [exportandoUno, setExportandoUno] = useState(false);
  const [exportandoTodos, setExportandoTodos] = useState(false);
  const viewShotRef = useRef<ViewShotRef>(null);

  const capturar = async (): Promise<string | null> => {
    try {
      return (await viewShotRef.current?.capture()) ?? null;
    } catch {
      return null;
    }
  };

  const tituloDe = (t: TipoGrafico) => `${tituloBase} — ${TIPOS.find((x) => x.valor === t)?.etiqueta}`;

  const descargarActual = async () => {
    setExportandoUno(true);
    try {
      const imagen = await capturar();
      if (!imagen) return;
      await generarYCompartirPdf(
        tituloDe(tipo),
        new Date().toLocaleString('es-PE'),
        `<img src="${imagen}" style="width:100%; border-radius:12px; margin-top:8px;" />`
      );
    } finally {
      setExportandoUno(false);
    }
  };

  const descargarTodos = async () => {
    setExportandoTodos(true);
    const tipoOriginal = tipo;
    try {
      const imagenes: { titulo: string; uri: string }[] = [];
      for (const t of TIPOS) {
        setTipo(t.valor);
        await esperarRender();
        const imagen = await capturar();
        if (imagen) imagenes.push({ titulo: t.etiqueta, uri: imagen });
      }
      const cuerpo = imagenes
        .map(
          (im) => `
            <h2 style="font-size:14px; margin:24px 0 4px;">${im.titulo}</h2>
            <img src="${im.uri}" style="width:100%; border-radius:12px;" />
          `
        )
        .join('');
      await generarYCompartirPdf(tituloBase, `Barras, circular y línea · ${new Date().toLocaleString('es-PE')}`, cuerpo);
    } finally {
      setTipo(tipoOriginal);
      setExportandoTodos(false);
    }
  };

  const totalMonto = puntos.reduce((acc, p) => acc + p.monto, 0);

  return (
    <View style={[styles.card, styles.cardShadow]}>
      <View style={styles.headerRow}>
        <Text style={styles.titulo}>{tituloBase}</Text>
        <View style={styles.tiposRow}>
          {TIPOS.map((t) => (
            <Pressable
              key={t.valor}
              style={[styles.tipoChip, tipo === t.valor && styles.tipoChipActivo]}
              onPress={() => setTipo(t.valor)}
            >
              <Text style={[styles.tipoChipTexto, tipo === t.valor && styles.tipoChipTextoActivo]}>{t.etiqueta}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={styles.capturaWrap}>
        {tipo === 'barra' && (
          <BarChart
            data={puntos.map((p) => ({ value: Math.round(p.monto), label: p.etiqueta }))}
            barWidth={26}
            spacing={18}
            roundedTop
            frontColor={colors.primary}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            noOfSections={4}
            hideRules
            showValuesAsTopLabel
            topLabelTextStyle={{ color: colors.text, fontSize: 10, fontWeight: '700' }}
          />
        )}

        {tipo === 'circular' && (
          <View>
            <View style={styles.pieWrap}>
              <PieChart
                data={puntos.map((p, i) => ({ value: p.monto, color: PALETA[i % PALETA.length] }))}
                donut
                radius={90}
                innerRadius={55}
                innerCircleColor={colors.card}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>Total</Text>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>PEN {totalMonto.toFixed(0)}</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.leyenda}>
              {puntos.map((p, i) => (
                <View key={p.etiqueta} style={styles.leyendaFila}>
                  <View style={[styles.leyendaColor, { backgroundColor: PALETA[i % PALETA.length] }]} />
                  <Text style={styles.leyendaTexto} numberOfLines={1}>
                    {p.etiqueta}
                  </Text>
                  <Text style={styles.leyendaValor}>PEN {p.monto.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {tipo === 'linea' && (
          <LineChart
            data={puntos.map((p) => ({ value: Math.round(p.monto), label: p.etiqueta, dataPointText: String(Math.round(p.monto)) }))}
            color={colors.primary}
            thickness={3}
            curved
            dataPointsColor={colors.accent}
            textColor1={colors.text}
            textFontSize={10}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            noOfSections={4}
            hideRules
            areaChart
            startFillColor={colors.primary}
            endFillColor={colors.primary}
            startOpacity={0.25}
            endOpacity={0.02}
          />
        )}
      </ViewShot>

      <View style={styles.descargasRow}>
        <Pressable style={styles.descargaBtn} onPress={descargarActual} disabled={exportandoUno || exportandoTodos}>
          {exportandoUno ? <ActivityIndicator color={colors.text} /> : <Text style={styles.descargaBtnTexto}>Descargar este gráfico</Text>}
        </Pressable>
        <Pressable style={[styles.descargaBtn, styles.descargaBtnSecundario]} onPress={descargarTodos} disabled={exportandoUno || exportandoTodos}>
          {exportandoTodos ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.descargaBtnTexto}>Descargar los 3 (PDF)</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 },
  titulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  tiposRow: { flexDirection: 'row', gap: 6 },
  tipoChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tipoChipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  tipoChipTexto: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  tipoChipTextoActivo: { color: colors.text },
  capturaWrap: { backgroundColor: colors.card },
  pieWrap: { alignItems: 'center', paddingVertical: 8 },
  leyenda: { marginTop: 12, gap: 6 },
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leyendaColor: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { color: colors.textMuted, fontSize: 12, flex: 1 },
  leyendaValor: { color: colors.text, fontSize: 12, fontWeight: '700' },
  descargasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  descargaBtn: { flex: 1, minWidth: 150, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  descargaBtnSecundario: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  descargaBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 12 },
});
