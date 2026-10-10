import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../constants/theme';

// Destino del botón "Finalizar y ver mi acceso" de la landing: la Edge
// Function `demo-operador` ya creó la cuenta de Operador Colombia en DEMO y
// manda un token_hash de un solo uso. Acá se canjea por la sesión y se
// entra directo a la plataforma.
export default function DemoAcceso() {
  const { th } = useLocalSearchParams<{ th?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!th) {
      setError('El enlace de acceso no es válido.');
      return;
    }
    (async () => {
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: th, type: 'magiclink' });
      if (vErr) {
        setError('Tu enlace de acceso ya se usó o venció. Entra con Google usando tu correo.');
        return;
      }
      router.replace('/');
    })();
  }, [th]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Ir a entrar</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  error: { color: colors.danger, fontSize: 16, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 28 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
