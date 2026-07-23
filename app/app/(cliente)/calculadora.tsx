import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { calcularConversion } from '../../lib/tasaCalculo';
import { Tasa } from '../../types/database';
import { colors } from '../../constants/theme';

/**
 * F2 — Calculadora doble PEN→USDT→VES.
 * Usa la tasa del día (F1, publicada por el Operador Perú) y muestra el desglose completo.
 */
export default function Calculadora() {
  const [tasa, setTasa] = useState<Tasa | null>(null);
  const [monto, setMonto] = useState('250');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    supabase
      .from('tasas')
      .select('*')
      .eq('fecha', hoy)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setTasa(data as Tasa | null);
      });
  }, []);

  const montoNum = Number(monto.replace(',', '.')) || 0;
  const desglose = tasa ? calcularConversion(montoNum, tasa.tasa_pen_usdt, tasa.tasa_usdt_ves) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>¿Cuánto quieres enviar?</Text>

      <Text style={styles.label}>Monto en Soles (S/)</Text>
      <TextInput
        style={styles.input}
        value={monto}
        onChangeText={setMonto}
        keyboardType="decimal-pad"
        placeholder="250"
        placeholderTextColor={colors.textMuted}
      />

      {!tasa && !error && <Text style={styles.hint}>Cargando tasa del día…</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!tasa && !error && (
        <Text style={styles.hint}>No hay tasa publicada hoy todavía. Intenta más tarde.</Text>
      )}

      {desglose && (
        <View style={styles.resultCard}>
          <Row label="Tasa PEN → USDT" value={`S/ ${desglose.tasaPenUsdt.toFixed(3)}`} />
          <Row label="Equivale a" value={`${desglose.montoUsdt.toFixed(2)} USDT`} />
          <Row label="Tasa USDT → VES" value={`Bs ${desglose.tasaUsdtVes.toFixed(2)}`} />
          <View style={styles.divider} />
          <Row label="Tu familiar recibe" value={`Bs ${desglose.montoVes.toFixed(2)}`} big />
        </View>
      )}

      <Pressable
        style={[styles.button, !desglose && styles.buttonDisabled]}
        disabled={!desglose}
        onPress={() =>
          router.push({
            pathname: '/(cliente)/nueva-solicitud',
            params: { monto: String(montoNum), tasaId: tasa?.id ?? '' },
          })
        }
      >
        <Text style={styles.buttonText}>Continuar con esta solicitud</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, big && styles.rowValueBig]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  label: { color: colors.textMuted, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
  resultCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  rowValueBig: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
