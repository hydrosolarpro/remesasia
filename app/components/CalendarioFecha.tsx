import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function hoy() {
  return new Date();
}

// Calendario de días: navegación mes a mes, cuadrícula de 7 columnas con
// los días en blanco iniciales para alinear con el día de la semana.
export function CalendarioDias({ valor, onSeleccionar }: { valor: string; onSeleccionar: (isoFecha: string) => void }) {
  const base = valor ? new Date(`${valor}T00:00:00`) : hoy();
  const [mes, setMes] = useState(base.getMonth());
  const [anio, setAnio] = useState(base.getFullYear());

  const cambiarMes = (delta: number) => {
    let m = mes + delta;
    let a = anio;
    if (m < 0) {
      m = 11;
      a -= 1;
    } else if (m > 11) {
      m = 0;
      a += 1;
    }
    setMes(m);
    setAnio(a);
  };

  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas: (number | null)[] = [...Array(primerDiaSemana).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => i + 1)];

  const isoDe = (dia: number) => `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  return (
    <View>
      <View style={styles.navRow}>
        <Pressable style={styles.navBtn} onPress={() => cambiarMes(-1)}>
          <Text style={styles.navBtnTexto}>‹</Text>
        </Pressable>
        <Text style={styles.navTitulo}>
          {MESES_LARGOS[mes]} {anio}
        </Text>
        <Pressable style={styles.navBtn} onPress={() => cambiarMes(1)}>
          <Text style={styles.navBtnTexto}>›</Text>
        </Pressable>
      </View>
      <View style={styles.semanaRow}>
        {DIAS_SEMANA.map((d, i) => (
          <Text key={i} style={styles.semanaTexto}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.gridDias}>
        {celdas.map((dia, i) =>
          dia === null ? (
            <View key={i} style={styles.celdaDia} />
          ) : (
            <Pressable key={i} style={styles.celdaDia} onPress={() => onSeleccionar(isoDe(dia))}>
              <View style={[styles.celdaDiaCirculo, valor === isoDe(dia) && styles.celdaActiva]}>
                <Text style={[styles.celdaTexto, valor === isoDe(dia) && styles.celdaTextoActivo]}>{dia}</Text>
              </View>
            </Pressable>
          )
        )}
      </View>
      <Pressable style={styles.hoyBtn} onPress={() => onSeleccionar(isoDe(hoy().getDate()))}>
        <Text style={styles.hoyBtnTexto}>Hoy</Text>
      </Pressable>
    </View>
  );
}

// Calendario de meses: navegación año a año, cuadrícula de 12 meses.
export function CalendarioMeses({ valor, onSeleccionar }: { valor: string; onSeleccionar: (isoMes: string) => void }) {
  const [anioMesActual, mesActual] = valor ? valor.split('-').map(Number) : [hoy().getFullYear(), hoy().getMonth() + 1];
  const [anio, setAnio] = useState(anioMesActual);

  return (
    <View>
      <View style={styles.navRow}>
        <Pressable style={styles.navBtn} onPress={() => setAnio((a) => a - 1)}>
          <Text style={styles.navBtnTexto}>‹</Text>
        </Pressable>
        <Text style={styles.navTitulo}>{anio}</Text>
        <Pressable style={styles.navBtn} onPress={() => setAnio((a) => a + 1)}>
          <Text style={styles.navBtnTexto}>›</Text>
        </Pressable>
      </View>
      <View style={styles.gridMeses}>
        {MESES_CORTOS.map((etiqueta, i) => {
          const valorMes = `${anio}-${String(i + 1).padStart(2, '0')}`;
          const activo = anio === anioMesActual && i + 1 === mesActual && valor === valorMes;
          return (
            <Pressable key={etiqueta} style={styles.celdaMes} onPress={() => onSeleccionar(valorMes)}>
              <View style={[styles.celdaMesCaja, activo && styles.celdaActiva]}>
                <Text style={[styles.celdaTexto, activo && styles.celdaTextoActivo]}>{etiqueta}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Calendario de años: cuadrícula de 12 años con navegación por década.
export function CalendarioAnios({ valor, onSeleccionar }: { valor: string; onSeleccionar: (isoAnio: string) => void }) {
  const anioBase = valor ? Number(valor) : hoy().getFullYear();
  const [inicioDecada, setInicioDecada] = useState(anioBase - (anioBase % 10) - 1);

  const anios = Array.from({ length: 12 }, (_, i) => inicioDecada + i);

  return (
    <View>
      <View style={styles.navRow}>
        <Pressable style={styles.navBtn} onPress={() => setInicioDecada((a) => a - 12)}>
          <Text style={styles.navBtnTexto}>‹</Text>
        </Pressable>
        <Text style={styles.navTitulo}>
          {anios[0]} – {anios[anios.length - 1]}
        </Text>
        <Pressable style={styles.navBtn} onPress={() => setInicioDecada((a) => a + 12)}>
          <Text style={styles.navBtnTexto}>›</Text>
        </Pressable>
      </View>
      <View style={styles.gridMeses}>
        {anios.map((a) => {
          const activo = String(a) === valor;
          return (
            <Pressable key={a} style={styles.celdaMes} onPress={() => onSeleccionar(String(a))}>
              <View style={[styles.celdaMesCaja, activo && styles.celdaActiva]}>
                <Text style={[styles.celdaTexto, activo && styles.celdaTextoActivo]}>{a}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnTexto: { color: colors.text, fontSize: 16, fontWeight: '700' },
  navTitulo: { color: colors.text, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  semanaRow: { flexDirection: 'row' },
  semanaTexto: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  gridDias: { flexDirection: 'row', flexWrap: 'wrap' },
  celdaDia: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  celdaDiaCirculo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  gridMeses: { flexDirection: 'row', flexWrap: 'wrap' },
  celdaMes: { width: '33.333%', paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  celdaMesCaja: { width: '90%', paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  celdaActiva: { backgroundColor: colors.primary },
  celdaTexto: { color: colors.text, fontSize: 12, fontWeight: '600' },
  celdaTextoActivo: { color: '#fff', fontWeight: '800' },
  hoyBtn: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.cardAlt },
  hoyBtnTexto: { color: colors.accent, fontSize: 12, fontWeight: '700' },
});
