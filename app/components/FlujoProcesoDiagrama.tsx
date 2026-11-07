import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { nombreMoneda } from '../lib/guiaContenido';
import { useCorredor } from '../lib/corredor';
import { colors, radius } from '../constants/theme';

// Esquema visual del flujo de 4 pasos (ver funcionaldiades - flujo remesas
// peru-venezuela.pdf, última página). Tarjetas conectadas por flechas, con
// quién ejecuta cada paso (color), una frase corta y el estado de la
// operación en ese punto. Debajo, el ciclo "No ha llegado → Por revisar".
// Vive en el Panel del Operador principal, único rol que necesita ver el
// flujo completo del negocio. En pantalla ancha los pasos van en fila; en
// móvil, apilados con flecha hacia abajo.

type Actor = 'cliente' | 'operador_recepcion' | 'operador_venezuela';

interface PasoEsquema {
  n: number;
  icono: string;
  titulo: string;
  actor: Actor;
  puntos: string[];
  estado: { texto: string; color: string };
}

const ANCHO_FILA = 760;

export function FlujoProcesoDiagrama() {
  const { corredor } = useCorredor();
  const { width } = useWindowDimensions();
  const enFila = width >= ANCHO_FILA;
  const pais = corredor.paisRecepcion;
  const moneda = nombreMoneda(corredor.monedaCodigo);

  const ETIQUETA_ACTOR: Record<Actor, { texto: string; color: string }> = {
    cliente: { texto: `CLIENTE · ${pais.toUpperCase()}`, color: colors.accent },
    operador_recepcion: { texto: `OPERADOR · ${pais.toUpperCase()}`, color: colors.primary },
    operador_venezuela: { texto: `OPERADOR · ${corredor.paisEntrega.toUpperCase()}`, color: colors.warning },
  };

  const pasos: PasoEsquema[] = [
    {
      n: 1,
      icono: '📝',
      titulo: 'El cliente solicita',
      actor: 'cliente',
      puntos: ['Ingresa el monto', 'Datos del beneficiario', 'Adjunta comprobante del depósito'],
      estado: { texto: 'En curso', color: colors.warning },
    },
    {
      n: 2,
      icono: '🔍',
      titulo: `${pais} valida`,
      actor: 'operador_recepcion',
      puntos: [`Valida el depósito en ${moneda}`, 'Aviso al cliente por Telegram', 'Deriva al equipo o valida directo'],
      estado: { texto: 'Validada', color: colors.primary },
    },
    {
      n: 3,
      icono: '💸',
      titulo: `${corredor.paisEntrega} transfiere`,
      actor: 'operador_venezuela',
      puntos: ['Transfiere al beneficiario', 'Sube su comprobante', 'Aviso por Telegram con la imagen'],
      estado: { texto: 'Realizada', color: colors.success },
    },
    {
      n: 4,
      icono: '✅',
      titulo: 'El cliente confirma',
      actor: 'cliente',
      puntos: ['Confirma que el beneficiario recibió', 'O marca "No ha llegado"'],
      estado: { texto: 'Cerrada', color: colors.success },
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>Esto es lo que pasa detrás de cada remesa, de principio a fin.</Text>

      <View style={[styles.pasosContenedor, enFila ? styles.pasosFila : styles.pasosColumna]}>
        {pasos.map((paso, i) => {
          const ultimo = i === pasos.length - 1;
          const actor = ETIQUETA_ACTOR[paso.actor];
          return (
            <View key={paso.n} style={[styles.pasoYFlecha, enFila ? styles.pasoYFlechaFila : styles.pasoYFlechaColumna, enFila && { flex: 1 }]}>
              <View style={[styles.tarjeta, { borderTopColor: actor.color }, enFila && { flex: 1 }]}>
                <View style={styles.tarjetaCabecera}>
                  <View style={[styles.circulo, { backgroundColor: actor.color }]}>
                    <Text style={styles.circuloTexto}>{paso.n}</Text>
                  </View>
                  <Text style={styles.icono}>{paso.icono}</Text>
                </View>
                <Text style={styles.titulo}>{paso.titulo}</Text>
                <View style={[styles.pill, { backgroundColor: `${actor.color}33` }]}>
                  <Text style={styles.pillTexto}>{actor.texto}</Text>
                </View>
                <View style={styles.puntos}>
                  {paso.puntos.map((p) => (
                    <View key={p} style={styles.puntoFila}>
                      <Text style={[styles.viñeta, { color: actor.color }]}>•</Text>
                      <Text style={styles.puntoTexto}>{p}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.estadoFila}>
                  <Text style={styles.estadoLabel}>Estado:</Text>
                  <View style={[styles.estadoChip, { borderColor: paso.estado.color }]}>
                    <View style={[styles.estadoPunto, { backgroundColor: paso.estado.color }]} />
                    <Text style={[styles.estadoChipTexto, { color: paso.estado.color }]}>{paso.estado.texto}</Text>
                  </View>
                </View>
              </View>
              {!ultimo && <Text style={styles.flecha}>{enFila ? '➜' : '⬇'}</Text>}
            </View>
          );
        })}
      </View>

      {/* Ciclo de excepción: el cliente marca "No ha llegado" */}
      <View style={styles.excepcion}>
        <Text style={styles.excepcionTitulo}>↺ Si el dinero no llegó</Text>
        <View style={styles.excepcionFila}>
          <View style={[styles.estadoChip, { borderColor: colors.danger }]}>
            <Text style={[styles.estadoChipTexto, { color: colors.danger }]}>Cliente: "No ha llegado"</Text>
          </View>
          <Text style={styles.flechaMini}>➜</Text>
          <View style={[styles.estadoChip, { borderColor: colors.danger }]}>
            <View style={[styles.estadoPunto, { backgroundColor: colors.danger }]} />
            <Text style={[styles.estadoChipTexto, { color: colors.danger }]}>Por revisar</Text>
          </View>
          <Text style={styles.flechaMini}>➜</Text>
          <View style={[styles.estadoChip, { borderColor: colors.primary }]}>
            <Text style={[styles.estadoChipTexto, { color: colors.primary }]}>Un operador resuelve y recarga comprobante</Text>
          </View>
          <Text style={styles.flechaMini}>➜</Text>
          <View style={[styles.estadoChip, { borderColor: colors.success }]}>
            <View style={[styles.estadoPunto, { backgroundColor: colors.success }]} />
            <Text style={[styles.estadoChipTexto, { color: colors.success }]}>Realizada</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  intro: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  pasosContenedor: { gap: 4 },
  pasosFila: { flexDirection: 'row', alignItems: 'stretch' },
  pasosColumna: { flexDirection: 'column' },
  pasoYFlecha: { alignItems: 'center' },
  pasoYFlechaFila: { flexDirection: 'row', gap: 6 },
  pasoYFlechaColumna: { flexDirection: 'column', gap: 2 },
  tarjeta: {
    alignSelf: 'stretch',
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    borderRadius: radius.md ?? 12,
    padding: 12,
    gap: 8,
  },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circulo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  circuloTexto: { color: colors.bg, fontWeight: '900', fontSize: 14 },
  icono: { fontSize: 22 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pillTexto: { color: colors.text, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  puntos: { gap: 4 },
  puntoFila: { flexDirection: 'row', gap: 6 },
  viñeta: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  puntoTexto: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  estadoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  estadoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  estadoPunto: { width: 7, height: 7, borderRadius: 4 },
  estadoChipTexto: { fontSize: 12, fontWeight: '800' },
  flecha: { color: colors.textMuted, fontSize: 18, alignSelf: 'center' },
  flechaMini: { color: colors.textMuted, fontSize: 14 },
  excepcion: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.danger,
    borderRadius: radius.md ?? 12,
    padding: 12,
    gap: 8,
  },
  excepcionTitulo: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  excepcionFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
});
