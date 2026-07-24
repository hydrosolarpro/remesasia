import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { signInWithGoogle } from '../../lib/googleAuth';
import { canjearInvitacion, guardarTokenPendiente } from '../../lib/invitaciones';
import { BannerTitle } from '../../components/AppBanner';
import { colors, radius } from '../../constants/theme';

// Pantalla de aterrizaje de un enlace de invitación (admin -> Operador
// Perú, u Operador Perú -> cliente). Si no hay sesión, guarda el token y
// manda a Google; si ya hay sesión, canjea directo.
export default function Invitacion() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading } = useAuth();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session || !token) return;
    (async () => {
      setProcesando(true);
      try {
        const resultado = await canjearInvitacion(token);
        if (!resultado.ok) {
          setError(resultado.error ?? 'No se pudo usar esta invitación.');
          setProcesando(false);
          return;
        }
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo usar esta invitación.');
        setProcesando(false);
      }
    })();
  }, [loading, session, token]);

  const continuarConGoogle = async () => {
    setError(null);
    if (token) await guardarTokenPendiente(token);
    setProcesando(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
      setProcesando(false);
    }
  };

  if (loading || procesando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BannerTitle />
      <Text style={styles.titulo}>Te invitaron a Remesas PERU-VENEZUELA</Text>
      <Text style={styles.subtitulo}>Continúa con Google para entrar directo a tu sesión.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={continuarConGoogle}>
        <Text style={styles.buttonText}>Continuar con Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 8 },
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  subtitulo: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
