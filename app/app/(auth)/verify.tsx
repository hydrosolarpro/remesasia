import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/theme';

export default function Verify() {
  const { telefono } = useLocalSearchParams<{ telefono: string }>();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verificar = async () => {
    setError(null);
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: telefono,
      token: codigo,
      type: 'sms',
    });
    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificar código</Text>
      <Text style={styles.subtitle}>Enviamos un SMS a {telefono}</Text>

      <TextInput
        style={styles.input}
        value={codigo}
        onChangeText={setCodigo}
        keyboardType="number-pad"
        placeholder="123456"
        placeholderTextColor={colors.textMuted}
        maxLength={6}
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={verificar} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Verificar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: 'center',
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
