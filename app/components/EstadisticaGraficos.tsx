import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { generarYCompartirPdf } from '../lib/pdfReporte';
import { colors, radius } from '../constants/theme';

export interface PuntoGrafico {
  etiqueta: string;
  monto: number;
}

export interface EstadisticaGraficosHandle {
  /** Cambia entre los 3 tipos de gráfico y captura una imagen de cada uno, dejando el tipo original seleccionado al terminar. */
  capturarImagenes: () => Promise<{ titulo: string; uri: string }[]>;
}

type TipoGrafico = 'barra' | 'circular' | 'linea';

const TIPOS: { valor: TipoGrafico; etiqueta: string }[] = [
  { valor: 'barra', etiqueta: 'Barras' },
  { valor: 'circular', etiqueta: 'Circular' },
  { valor: 'linea', etiqueta: 'Línea' },
];

const PALETA = [colors.primary, colors.accent, colors.warning, colors.success, colors.danger, colors.gradientEnd];

// Ancho aproximado que gifted-charts reserva para las etiquetas del eje Y
// (barras/línea) -- se descuenta del ancho medido para que el contenido
// del gráfico (barWidth*n + spacing*n) quepa siempre dentro del ancho
// disponible y no dependa del scroll horizontal interno de la librería,
// que es lo que provocaba que la imagen exportada saliera recortada.
const ESPACIO_EJE_Y = 46;

// Espera un par de frames para que React termine de aplicar un cambio de
// estado (p.ej. cambiar el tipo de gráfico) antes de capturarlo -- si se
// captura en el mismo tick, ViewShot todavía ve el gráfico anterior.
function esperarRender() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

// Selector de tipo de gráfico (barras/circular/línea) + descarga en PDF,
// individual (con su título) o de los 3 tipos juntos. Usado tanto por
// Estadísticas del operador como por la del cliente. `contenidoExtraHtml`
// (resumen + detalle de operaciones, ya armado en HTML por quien lo use)
// se agrega debajo de las 3 imágenes al exportar "Descargar los 3 (PDF)".
export const EstadisticaGraficos = forwardRef<
  EstadisticaGraficosHandle,
  { puntos: PuntoGrafico[]; tituloBase: string; contenidoExtraHtml?: string }
>(function EstadisticaGraficos({ puntos, tituloBase, contenidoExtraHtml }, ref) {
  const [tipo, setTipo] = useState<TipoGrafico>('barra');
  const [exportandoUno, setExportandoUno] = useState(false);
  const [exportandoTodos, setExportandoTodos] = useState(false);
  const [anchoDisponible, setAnchoDisponible] = useState(0);
  const viewShotRef = useRef<ViewShotRef>(null);

  const onLayoutCaptura = useCallback((e: LayoutChangeEvent) => {
    setAnchoDisponible(e.nativeEvent.layout.width);
  }, []);

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
      await generarYCompartirPdf(tituloDe(tipo), new Date().toLocaleString('es-PE'), `<img src="${imagen}" />`);
    } finally {
      setExportandoUno(false);
    }
  };

  const capturarImagenes = useCallback(async () => {
    const tipoOriginal = tipo;
    const imagenes: { titulo: string; uri: string }[] = [];
    for (const t of TIPOS) {
      setTipo(t.valor);
      await esperarRender();
      const imagen = await capturar();
      if (imagen) imagenes.push({ titulo: t.etiqueta, uri: imagen });
    }
    setTipo(tipoOriginal);
    return imagenes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  useImperativeHandle(ref, () => ({ capturarImagenes }), [capturarImagenes]);

  const descargarTodos = async () => {
    setExportandoTodos(true);
    try {
      const imagenes = await capturarImagenes();
      const cuerpoGraficos = imagenes
        .map((im) => `<div class="grafico-bloque"><h2>${im.titulo}</h2><img src="${im.uri}" /></div>`)
        .join('');
      await generarYCompartirPdf(
        tituloBase,
        `Barras, circular y línea · ${new Date().toLocaleString('es-PE')}`,
        cuerpoGraficos + (contenidoExtraHtml ?? '')
      );
    } finally {
      setExportandoTodos(false);
    }
  };

  const totalMonto = puntos.reduce((acc, p) => acc + p.monto, 0);

  // Ancho útil para las barras/línea (descontando el eje Y) y radio del
  // circular, ambos calculados a partir del ancho real medido por
  // onLayout -- así todos los puntos entran siempre dentro del área
  // capturada, sin que la librería necesite recurrir a su scroll interno
  // (que es lo que quedaba fuera de la imagen exportada).
  const anchoUtil = Math.max(anchoDisponible - ESPACIO_EJE_Y, 60);
  const pieRadio = anchoDisponible > 0 ? Math.max(50, Math.min(90, anchoDisponible / 2 - 30)) : 90;
  const pieRadioInterno = Math.round(pieRadio * 0.61);

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

      <ViewShot
        ref={viewShotRef}
        onLayout={onLayoutCaptura}
        options={{ format: 'png', quality: 1, result: 'data-uri' }}
        style={styles.capturaWrap}
      >
        {anchoDisponible === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 40 }} />
        ) : (
          <>
            {tipo === 'barra' && (
              <BarChart
                data={puntos.map((p) => ({ value: Math.round(p.monto), label: p.etiqueta }))}
                width={anchoUtil}
                parentWidth={anchoUtil}
                adjustToWidth
                roundedTop
                frontColor={colors.primary}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 12 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                noOfSections={4}
                hideRules
                showValuesAsTopLabel
                topLabelTextStyle={{ color: colors.text, fontSize: 12, fontWeight: '700' }}
              />
            )}

            {tipo === 'circular' && (
              <View>
                <View style={styles.pieWrap}>
                  <PieChart
                    data={puntos.map((p, i) => ({ value: p.monto, color: PALETA[i % PALETA.length] }))}
                    donut
                    radius={pieRadio}
                    innerRadius={pieRadioInterno}
                    innerCircleColor={colors.card}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Total</Text>
                        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>PEN {totalMonto.toFixed(0)}</Text>
                      </View>
                    )}
                  />
                </View>
                <View style={styles.leyenda}>
                  {puntos.map((p, i) => (
                    <View key={p.etiqueta} style={styles.leyendaFila}>
                      <View style={[styles.leyendaColor, { backgroundColor: PALETA[i % PALETA.length] }]} />
                      <Text style={styles.leyendaTexto}>{p.etiqueta}</Text>
                      <Text style={styles.leyendaValor}>PEN {p.monto.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {tipo === 'linea' && (
              <LineChart
                data={puntos.map((p) => ({ value: Math.round(p.monto), label: p.etiqueta, dataPointText: String(Math.round(p.monto)) }))}
                width={anchoUtil}
                adjustToWidth
                color={colors.primary}
                thickness={3}
                curved
                dataPointsColor={colors.accent}
                textColor1={colors.text}
                textFontSize={10}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 12 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                noOfSections={4}
                hideRules
                areaChart
                startFillColor={colors.primary}
                endFillColor={colors.primary}
                startOpacity={0.25}
                endOpacity={0.02}
              />
            )}
          </>
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
});

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
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  tiposRow: { flexDirection: 'row', gap: 6 },
  tipoChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tipoChipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  tipoChipTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  tipoChipTextoActivo: { color: colors.text },
  capturaWrap: { backgroundColor: colors.card },
  pieWrap: { alignItems: 'center', paddingVertical: 8 },
  leyenda: { marginTop: 12, gap: 6 },
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leyendaColor: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  leyendaTexto: { color: colors.textMuted, fontSize: 14, flex: 1, flexShrink: 1 },
  leyendaValor: { color: colors.text, fontSize: 14, fontWeight: '700' },
  descargasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  descargaBtn: { flex: 1, minWidth: 150, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  descargaBtnSecundario: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  descargaBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
});
