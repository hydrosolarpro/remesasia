import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, TextInput, Linking, ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { signInWithGoogle } from '../../lib/googleAuth';
import { loginConPin, enlaceWaOlvidePin } from '../../lib/pinAuth';
import { TelefonoInput, telefonoCompleto } from '../../components/TelefonoInput';
import { useAuth } from '../../lib/auth';
import { colors, radius } from '../../constants/theme';

const DESTACADOS = [
  'Confirmación automática para ti y tu familia — sin tener que preguntar, sin esperar respuesta por WhatsApp. Tus seres queridos son avisados en el momento exacto.',
  'Integración automática sin fronteras — control total de operaciones transnacionales entre Perú y Venezuela en tiempo real.',
  'Automatización, notificaciones instantáneas y perfil multi-operador.',
];

type Metodo = 'pin' | 'google';

export default function Login() {
  const { session, usuario, loading: authLoading } = useAuth();
  const [metodo, setMetodo] = useState<Metodo>('pin');
  const [codigoTel, setCodigoTel] = useState('51');
  const [numeroTel, setNumeroTel] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forzarNuevoPin, setForzarNuevoPin] = useState(false);

  if (forzarNuevoPin) {
    return <Redirect href="/(auth)/nuevo-pin" />;
  }

  // Si ya hay sesión (p. ej. el acceso directo del celular quedó apuntando
  // a /login, o el usuario vuelve atrás), mandar a la raíz para que
  // index.tsx enrute a su panel.
  if (!authLoading && session && usuario) {
    return <Redirect href="/" />;
  }

  const entrarConGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const entrarConPin = async () => {
    setError(null);
    if (!numeroTel.trim()) {
      setError('Escribe tu número de teléfono.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('El PIN es de 4 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const { pinTemporal } = await loginConPin(telefonoCompleto(codigoTel, numeroTel), pin);
      if (pinTemporal) setForzarNuevoPin(true);
      // Si el PIN no era temporal, el cambio de sesión redirige solo (Redirect de arriba).
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Image source={require('../../assets/android-icon-foreground.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Remesas PERÚ-VENEZUELA</Text>
      <Text style={styles.subtitle}>Y entérate al instante</Text>

      <View style={styles.destacados}>
        {DESTACADOS.map((texto) => (
          <View key={texto} style={styles.destacadoFila}>
            <Text style={styles.destacadoCheck}>✓</Text>
            <Text style={styles.destacadoTexto}>{texto}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, metodo === 'pin' && styles.tabActivo]}
          onPress={() => {
            setMetodo('pin');
            setError(null);
          }}
        >
          <Text style={[styles.tabTexto, metodo === 'pin' && styles.tabTextoActivo]}>Teléfono + PIN</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, metodo === 'google' && styles.tabActivo]}
          onPress={() => {
            setMetodo('google');
            setError(null);
          }}
        >
          <Text style={[styles.tabTexto, metodo === 'google' && styles.tabTextoActivo]}>Google</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {metodo === 'pin' ? (
        <View style={styles.pinForm}>
          <Text style={styles.label}>País y número de teléfono</Text>
          <TelefonoInput codigo={codigoTel} onCodigo={setCodigoTel} numero={numeroTel} onNumero={setNumeroTel} />
          <Text style={styles.label}>PIN de 4 dígitos</Text>
          <TextInput
            style={[styles.input, styles.inputPin]}
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="••••"
            placeholderTextColor={colors.textMuted}
          />

          <Pressable style={styles.button} onPress={entrarConPin} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>Entrar</Text>}
          </Pressable>

          <Pressable onPress={() => Linking.openURL(enlaceWaOlvidePin(telefonoCompleto(codigoTel, numeroTel)))}>
            <Text style={styles.olvide}>¿Olvidaste tu PIN? Escríbenos por WhatsApp →</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.button} onPress={entrarConGoogle} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.buttonText}>Continuar con Google</Text>
            </>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.4C41.5 35.6 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, paddingBottom: 40, justifyContent: 'center', gap: 8 },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 4 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.accent, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  destacados: { gap: 12, marginBottom: 24 },
  destacadoFila: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  destacadoCheck: { color: colors.success, fontSize: 15, fontWeight: '800', marginTop: 1 },
  destacadoTexto: { color: colors.textMuted, fontSize: 14, lineHeight: 19, flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  tabTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  tabTextoActivo: { color: colors.text },
  error: { color: colors.danger, marginBottom: 8, fontSize: 15 },
  pinForm: { gap: 4 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 18,
    marginTop: 5,
    backgroundColor: colors.card,
  },
  inputPin: { letterSpacing: 8, textAlign: 'center', fontSize: 24 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 16,
    marginTop: 14,
  },
  buttonText: { color: '#1F1F1F', fontWeight: '700', fontSize: 18 },
  olvide: { color: colors.accent, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 14 },
});
