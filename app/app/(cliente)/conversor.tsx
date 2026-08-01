import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { obtenerTasaBcv } from '../../lib/bcv';
import { calcularConversion, calcularConversionInversa, divisaAVes, vesADivisa } from '../../lib/tasaCalculo';
import { Tasa, TasaBcv } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

type Moneda = 'usd' | 'eur';
type Direccion = 'soles_a_divisa' | 'divisa_a_soles';

const ETIQUETA_MONEDA: Record<Moneda, string> = { usd: 'Dólar', eur: 'Euro' };
const SIMBOLO_MONEDA: Record<Moneda, string> = { usd: '$', eur: '€' };

// Conversor bidireccional Soles <-> Dólar/Euro para el cliente, usando la
// tasa del negocio (Soles->Bolívares) combinada con la tasa oficial BCV
// (Dólar/Euro->Bolívares) -- el mismo camino que ya usa el cálculo de
// referencia en (cliente)/index.tsx, pero en ambos sentidos.
export default function ConversorDivisas() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [tasa, setTasa] = useState<Tasa | null>(null);
  const [bcv, setBcv] = useState<TasaBcv | null>(null);
  const [moneda, setMoneda] = useState<Moneda>('usd');
  const [direccion, setDireccion] = useState<Direccion>('soles_a_divisa');
  const [monto, setMonto] = useState('');

  const negocioId = usuario?.negocio_operador_peru_id ?? null;

  useEffect(() => {
    if (!negocioId) {
      setCargando(false);
      return;
    }
    Promise.all([
      supabase
        .from('tasas')
        .select('*')
        .eq('publicada_por', negocioId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      obtenerTasaBcv().catch(() => null),
    ]).then(([{ data: tasaData }, bcvData]) => {
      setTasa(tasaData as Tasa | null);
      setBcv(bcvData);
      setCargando(false);
    });
  }, [negocioId]);

  const xVes = bcv ? (moneda === 'usd' ? bcv.usd_ves : bcv.eur_ves) : null;

  const resultado = useMemo(() => {
    const m = Number(monto.replace(',', '.'));
    if (!tasa || !xVes || !Number.isFinite(m) || m <= 0) return null;
    if (direccion === 'soles_a_divisa') {
      const ves = calcularConversion(m, tasa.tasa_pen_ves).montoVes;
      return { valor: vesADivisa(ves, xVes), unidad: SIMBOLO_MONEDA[moneda] };
    }
    const ves = divisaAVes(m, xVes);
    return { valor: calcularConversionInversa(ves, tasa.tasa_pen_ves), unidad: 'S/' };
  }, [monto, tasa, xVes, direccion, moneda]);

  const invertirDireccion = () => {
    setDireccion((d) => (d === 'soles_a_divisa' ? 'divisa_a_soles' : 'soles_a_divisa'));
    setMonto('');
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!negocioId) {
    return (
      <View style={styles.center}>
        <Text style={styles.avisoTexto}>Tu cuenta todavía no está vinculada a ningún negocio.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Conversor de divisas</Text>
      <Text style={styles.subtitulo}>Dólar y Euro según la tasa oficial BCV, combinada con la tasa Soles → Bolívares del negocio.</Text>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Moneda</Text>
        <View style={styles.chipsRow}>
          {(['usd', 'eur'] as Moneda[]).map((m) => (
            <Pressable key={m} style={[styles.chip, moneda === m && styles.chipActivo]} onPress={() => setMoneda(m)}>
              <Text style={[styles.chipTexto, moneda === m && styles.chipTextoActivo]}>{ETIQUETA_MONEDA[m]}</Text>
            </Pressable>
          ))}
        </View>
        {bcv && xVes ? (
          <Text style={styles.tasaTexto}>
            1 {ETIQUETA_MONEDA[moneda]} = Bs {xVes.toFixed(2)} (BCV) · S/1 = Bs {tasa?.tasa_pen_ves.toFixed(2) ?? '—'}
          </Text>
        ) : (
          <Text style={styles.tasaTexto}>No se pudo cargar la tasa BCV en este momento.</Text>
        )}
      </View>

      <View style={[styles.card, cardShadow]}>
        <View style={styles.direccionRow}>
          <Text style={styles.direccionTexto}>
            {direccion === 'soles_a_divisa' ? `Soles → ${ETIQUETA_MONEDA[moneda]}` : `${ETIQUETA_MONEDA[moneda]} → Soles`}
          </Text>
          <Pressable style={styles.invertirBtn} onPress={invertirDireccion}>
            <Text style={styles.invertirBtnTexto}>🔄 Invertir</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{direccion === 'soles_a_divisa' ? 'Monto en Soles' : `Monto en ${ETIQUETA_MONEDA[moneda]}`}</Text>
        <TextInput
          style={styles.montoInput}
          value={monto}
          onChangeText={setMonto}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
        />

        {resultado && (
          <View style={styles.resultado}>
            <Text style={styles.resultadoValor}>
              {resultado.unidad} {resultado.valor.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 20 },
  avisoTexto: { color: colors.textMuted, fontSize: 16, textAlign: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 25, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 15, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  seccionTitulo: { color: colors.text, fontSize: 17, fontWeight: '800' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  chipActivo: { borderColor: colors.accent, backgroundColor: `${colors.accent}22` },
  chipTexto: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  chipTextoActivo: { color: colors.accent },
  tasaTexto: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  direccionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  direccionTexto: { color: colors.text, fontSize: 17, fontWeight: '800' },
  invertirBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  invertirBtnTexto: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  montoInput: { color: colors.text, fontSize: 41, fontWeight: '900' },
  resultado: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  resultadoValor: { color: colors.accent, fontSize: 35, fontWeight: '900' },
});
