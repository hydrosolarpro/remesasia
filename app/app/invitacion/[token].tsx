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
// manda a Google; si ya hay sesión, canjea directo -- salvo que esa
// cuenta ya tenga un rol distinto de 'cliente' (canjear_invitacion lo
// rechaza para no sobreescribir una cuenta de operador por accidente).
export default function Invitacion() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading, signOut } = useAuth();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    if (loading || !session || !token) return;
    (async () => {
      setProcesando(true);
      try {
        const resultado = await canjearInvitacion(token);
        if (!resultado.ok) {
          // Se guarda el token pendiente por si el usuario cierra sesión y
          // continúa con otra cuenta: al volver a entrar, app/index.tsx lo
          // retoma solo.
          await guardarTokenPendiente(token);
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

  const cerrarSesionYContinuar = async () => {
    setCerrandoSesion(true);
    await signOut();
  };

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

  if (loading || procesando || cerrandoSesion) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Si ya hay una sesión activa (por eso llegó al error en vez del botón
  // de Google) no tiene sentido ofrecer "Continuar con Google" de nuevo --
  // hay que cerrar sesión primero para que la persona entre con la cuenta
  // correcta.
  const mostrarCerrarSesion = !!error && !!session;

  return (
    <View style={styles.container}>
      <BannerTitle />
      <Text style={styles.titulo}>Te invitaron a Remesas PERU-VENEZUELA</Text>
      <Text style={styles.subtitulo}>Continúa con Google para entrar directo a tu sesión.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mostrarCerrarSesion ? (
        <Pressable style={styles.button} onPress={cerrarSesionYContinuar}>
          <Text style={styles.buttonText}>Cerrar sesión y continuar con otra cuenta</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.button} onPress={continuarConGoogle}>
          <Text style={styles.buttonText}>Continuar con Google</Text>
        </Pressable>
      )}
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
