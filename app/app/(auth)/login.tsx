import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/theme';

export default function Login() {
  const [telefono, setTelefono] = useState('+51');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviarCodigo = async () => {
    setError(null);
    if (telefono.replace(/\D/g, '').length < 9) {
      setError('Ingresa un número de teléfono válido con código de país.');
      return;
    }
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: telefono });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { telefono } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Remesas IA</Text>
      <Text style={styles.subtitle}>PEN → USDT → VES</Text>

      <Text style={styles.label}>Número de teléfono</Text>
      <TextInput
        style={styles.input}
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
        placeholder="+51 999 999 999"
        placeholderTextColor={colors.textMuted}
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={enviarCodigo} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Enviar código</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 32 },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    marginTop: 6,
  },
  error: { color: colors.danger, marginTop: 10, fontSize: 13 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
