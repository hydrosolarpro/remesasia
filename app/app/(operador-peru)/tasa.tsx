import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Tasa } from '../../types/database';
import { colors } from '../../constants/theme';

const HOY = () => new Date().toISOString().slice(0, 10);

/** F1 — Publicación de la tasa del día. Base de todos los cálculos de la calculadora del cliente. */
export default function TasaDelDia() {
  const { usuario } = useAuth();
  const [tasaActual, setTasaActual] = useState<Tasa | null>(null);
  const [penUsdt, setPenUsdt] = useState('');
  const [usdtVes, setUsdtVes] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = async () => {
    if (!usuario) return;
    const { data } = await supabase
      .from('tasas')
      .select('*')
      .eq('fecha', HOY())
      .eq('publicada_por', usuario.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTasaActual(data as Tasa | null);
    if (data) {
      setPenUsdt(String(data.tasa_pen_usdt));
      setUsdtVes(String(data.tasa_usdt_ves));
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  const publicar = async () => {
    if (!usuario) return;
    setMensaje(null);
    if (!penUsdt || !usdtVes) {
      setMensaje('Completa las dos tasas antes de publicar.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('tasas').insert({
      fecha: HOY(),
      tasa_pen_usdt: Number(penUsdt),
      tasa_usdt_ves: Number(usdtVes),
      publicada_por: usuario.id,
    });
    setLoading(false);
    if (error) {
      setMensaje(error.message);
      return;
    }
    setMensaje('Tasa publicada. Ya está visible para los clientes.');
    cargar();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasa del día — {HOY()}</Text>
      {tasaActual && (
        <Text style={styles.hint}>
          Última publicada: S/{tasaActual.tasa_pen_usdt} / USDT · Bs{tasaActual.tasa_usdt_ves} / USDT
        </Text>
      )}

      <Text style={styles.label}>Tasa PEN → USDT (soles por 1 USDT)</Text>
      <TextInput
        style={styles.input}
        value={penUsdt}
        onChangeText={setPenUsdt}
        keyboardType="decimal-pad"
        placeholder="3.80"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Tasa USDT → VES (bolívares por 1 USDT)</Text>
      <TextInput
        style={styles.input}
        value={usdtVes}
        onChangeText={setUsdtVes}
        keyboardType="decimal-pad"
        placeholder="130.00"
        placeholderTextColor={colors.textMuted}
      />

      {mensaje && <Text style={styles.mensaje}>{mensaje}</Text>}

      <Pressable style={styles.button} onPress={publicar} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Publicar tasa</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 10 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.text, fontSize: 18 },
  mensaje: { color: colors.accent, fontSize: 13, marginTop: 8 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
