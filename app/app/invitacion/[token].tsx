import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { signInWithGoogle } from '../../lib/googleAuth';
import { canjearInvitacion, guardarTokenPendiente } from '../../lib/invitaciones';
import { provisionarPinDesdeInvitacion, enlaceWaEnviarPin } from '../../lib/pinAuth';
import { TelefonoInput, telefonoCompleto } from '../../components/TelefonoInput';
import { BannerTitle } from '../../components/AppBanner';
import { colors, radius } from '../../constants/theme';

type Metodo = 'pin' | 'google';

// Pantalla de aterrizaje de un enlace de invitación (admin -> Operador
// Perú, u Operador Perú -> cliente). Si ya hay sesión, canjea directo --
// salvo que la cuenta tenga un rol distinto de 'cliente' (canjear_invitacion
// lo rechaza para no sobreescribir una cuenta de operador por accidente).
// Sin sesión, el cliente elige cómo entrar: teléfono + PIN (recibe su PIN
// por WhatsApp y luego entra con su número) o "Continuar con Google".
export default function Invitacion() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, loading, signOut } = useAuth();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const [metodo, setMetodo] = useState<Metodo>('pin');
  const [nombre, setNombre] = useState('');
  const [codigoTel, setCodigoTel] = useState('51');
  const [numeroTel, setNumeroTel] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinEnviado, setPinEnviado] = useState<{ pin: string; telefono: string; reenvio: boolean } | null>(null);

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
          // Esta invitación es de cliente, pero el celular ya tenía una
          // sesión con OTRO rol (p.ej. el propio operador probando su
          // enlace). El enlace debe llevar SIEMPRE directo al registro de
          // un cliente nuevo, así que se cierra esa sesión sola en vez de
          // exigir un toque extra en "Cerrar sesión y continuar" -- al
          // volver a esta pantalla sin sesión, el flujo de abajo ya ofrece
          // teléfono + PIN o Google para registrarse.
          if (resultado.codigo === 'rol_distinto') {
            setCerrandoSesion(true);
            await signOut();
            return;
          }
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

  const crearAccesoConPin = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('Escribe tu nombre y apellido.');
      return;
    }
    if (!numeroTel.trim()) {
      setError('Escribe tu número de teléfono.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('Elige un PIN de 4 dígitos.');
      return;
    }
    if (pin !== pin2) {
      setError('Los dos PIN no coinciden.');
      return;
    }
    setProcesando(true);
    try {
      const res = await provisionarPinDesdeInvitacion(
        token,
        telefonoCompleto(codigoTel, numeroTel),
        nombre.trim(),
        pin
      );
      setPinEnviado(res);
      // `reenvio` = ya había una cuenta pendiente y el PIN elegido se
      // ignoró: se emitió uno TEMPORAL (recuperación). En alta nueva el
      // PIN es el definitivo que eligió el cliente.
      Linking.openURL(
        enlaceWaEnviarPin(res.telefono, res.pin, { temporal: res.reenvio })
      ).catch(() => {
        if (Platform.OS === 'web') {
          window.alert(
            res.reenvio
              ? `Tu PIN temporal es ${res.pin} (para +${res.telefono}). Entra con tu número y ese PIN; luego crearás tu PIN definitivo.`
              : `Listo. Entra con tu número +${res.telefono} y tu PIN.`
          );
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear tu acceso con PIN.');
    } finally {
      setProcesando(false);
    }
  };

  if (loading || procesando || cerrandoSesion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Si ya hay una sesión activa (por eso llegó al error en vez de los
  // botones de entrada) no tiene sentido ofrecer entrar de nuevo -- hay
  // que cerrar sesión primero para usar la cuenta correcta.
  const mostrarCerrarSesion = !!error && !!session;

  // Ya quedó el acceso: solo falta ir a la pantalla de entrada.
  if (pinEnviado) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BannerTitle />
        <Text style={styles.titulo}>
          {pinEnviado.reenvio ? 'Te reenviamos un PIN temporal' : 'Tu acceso está listo'}
        </Text>
        <Text style={styles.subtitulo}>
          {pinEnviado.reenvio
            ? 'Ese número ya tenía un acceso pendiente, así que te enviamos por WhatsApp un PIN temporal. Entra con tu número y ese PIN; en el primer ingreso crearás tu PIN definitivo.'
            : 'Te enviamos por WhatsApp tu número y tu PIN. Entra con ellos. Podrás cambiar tu PIN cuando quieras desde tu Perfil.'}
        </Text>
        <Text style={styles.pinAviso}>
          {pinEnviado.reenvio ? 'PIN temporal: ' : 'Tu PIN: '}
          <Text style={styles.pinNum}>{pinEnviado.pin}</Text> (para +{pinEnviado.telefono}). Si no se abrió
          WhatsApp, anótalo.
        </Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Ir a entrar con mi número y PIN</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <BannerTitle />
      <Text style={styles.titulo}>Te invitaron a Remesas PERÚ-VENEZUELA</Text>
      <Text style={styles.subtitulo}>Entra con tu número de teléfono y un PIN, o con Google.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mostrarCerrarSesion ? (
        <Pressable style={styles.button} onPress={cerrarSesionYContinuar}>
          <Text style={styles.buttonText}>Cerrar sesión y continuar con otra cuenta</Text>
        </Pressable>
      ) : (
        <>
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

          {metodo === 'pin' ? (
            <View style={styles.form}>
              <Text style={styles.label}>Nombre y apellido</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Tu nombre y apellido"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>País y número de teléfono</Text>
              <TelefonoInput codigo={codigoTel} onCodigo={setCodigoTel} numero={numeroTel} onNumero={setNumeroTel} />

              <Text style={styles.label}>Elige tu PIN (4 dígitos)</Text>
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
              <Text style={styles.label}>Repite el PIN</Text>
              <TextInput
                style={[styles.input, styles.inputPin]}
                value={pin2}
                onChangeText={(t) => setPin2(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                placeholder="••••"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.ayuda}>
                Este PIN queda como tuyo. Te enviaremos por WhatsApp tu número y tu PIN para que no lo olvides;
                podrás cambiarlo luego desde tu Perfil.
              </Text>
              <Pressable style={styles.button} onPress={crearAccesoConPin}>
                <Text style={styles.buttonText}>Crear mi acceso y recibirlo por WhatsApp</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.button} onPress={continuarConGoogle}>
              <Text style={styles.buttonText}>Continuar con Google</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: 24,
    paddingBottom: 40,
    justifyContent: 'center',
    gap: 8,
  },
  titulo: { color: colors.text, fontSize: 23, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  subtitulo: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginBottom: 16 },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center', marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
  form: { gap: 4 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 17,
    marginTop: 5,
    backgroundColor: colors.card,
  },
  inputPin: { letterSpacing: 8, textAlign: 'center', fontSize: 24 },
  ayuda: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 18 },
  pinAviso: { color: colors.warning, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  pinNum: { color: colors.text, fontWeight: '900', fontSize: 16 },
});
