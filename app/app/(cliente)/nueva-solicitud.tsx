import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { calcularConversion } from '../../lib/tasaCalculo';
import { MetodoPago, Tasa } from '../../types/database';
import { colors } from '../../constants/theme';

/**
 * F3 — Formulario de solicitud: monto, beneficiario venezolano y método de pago.
 * Crea la fila en `solicitudes` en estado PENDIENTE con la tasa del día congelada.
 */
export default function NuevaSolicitud() {
  const { usuario } = useAuth();
  const { monto, tasaId } = useLocalSearchParams<{ monto: string; tasaId: string }>();

  const [beneficiarioNombre, setBeneficiarioNombre] = useState('');
  const [beneficiarioBanco, setBeneficiarioBanco] = useState('');
  const [beneficiarioCuenta, setBeneficiarioCuenta] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('yape');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crearSolicitud = async () => {
    setError(null);
    if (!beneficiarioNombre || !beneficiarioBanco || !beneficiarioCuenta) {
      setError('Completa todos los datos del beneficiario.');
      return;
    }
    if (!usuario) {
      setError('Sesión inválida.');
      return;
    }
    setLoading(true);

    const { data: tasa, error: tasaError } = await supabase
      .from('tasas')
      .select('*')
      .eq('id', tasaId)
      .single<Tasa>();

    if (tasaError || !tasa) {
      setLoading(false);
      setError('La tasa del día ya no está disponible, vuelve a la calculadora.');
      return;
    }

    const montoNum = Number(monto);
    const { montoUsdt, montoVes } = calcularConversion(montoNum, tasa.tasa_pen_usdt, tasa.tasa_usdt_ves);

    const { data: solicitud, error: insertError } = await supabase
      .from('solicitudes')
      .insert({
        cliente_id: usuario.id,
        estado: 'PENDIENTE',
        monto_pen: montoNum,
        tasa_pen_usdt: tasa.tasa_pen_usdt,
        tasa_usdt_ves: tasa.tasa_usdt_ves,
        monto_usdt: montoUsdt,
        monto_ves: montoVes,
        beneficiario_nombre: beneficiarioNombre,
        beneficiario_banco: beneficiarioBanco,
        beneficiario_cuenta: beneficiarioCuenta,
        metodo_pago: metodoPago,
      })
      .select()
      .single();

    setLoading(false);
    if (insertError || !solicitud) {
      setError(insertError?.message ?? 'No se pudo crear la solicitud.');
      return;
    }

    router.replace({ pathname: '/(cliente)/solicitud/[id]', params: { id: solicitud.id } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Datos del beneficiario</Text>
      <Text style={styles.subtitle}>Enviarás S/ {monto} — completa quién lo recibe en Venezuela</Text>

      <Field label="Nombre completo" value={beneficiarioNombre} onChangeText={setBeneficiarioNombre} />
      <Field label="Banco venezolano" value={beneficiarioBanco} onChangeText={setBeneficiarioBanco} />
      <Field
        label="N° de cuenta o teléfono (Pago Móvil)"
        value={beneficiarioCuenta}
        onChangeText={setBeneficiarioCuenta}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Método de pago</Text>
      <View style={styles.metodoRow}>
        {(['yape', 'banco'] as MetodoPago[]).map((m) => (
          <Pressable
            key={m}
            style={[styles.metodoOption, metodoPago === m && styles.metodoOptionActive]}
            onPress={() => setMetodoPago(m)}
          >
            <Text style={[styles.metodoText, metodoPago === m && styles.metodoTextActive]}>
              {m === 'yape' ? 'Yape' : 'Transferencia bancaria'}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={crearSolicitud} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Crear solicitud</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholderTextColor={colors.textMuted}
        keyboardType={props.keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  label: { color: colors.textMuted, fontSize: 13 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.text, fontSize: 16 },
  metodoRow: { flexDirection: 'row', gap: 10 },
  metodoOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  metodoOptionActive: { borderColor: colors.primary, backgroundColor: '#0F62FE22' },
  metodoText: { color: colors.textMuted, fontWeight: '600' },
  metodoTextActive: { color: colors.text },
  error: { color: colors.danger, fontSize: 13 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
