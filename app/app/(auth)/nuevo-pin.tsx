import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { miEstadoPin, definirMiPin, vincularCorreoSesion, esCorreoPinSintetico } from '../../lib/pinAuth';
import { TelefonoInput, telefonoCompleto, separarTelefono } from '../../components/TelefonoInput';
import { colors, radius } from '../../constants/theme';

// Pantalla para crear / cambiar el PIN de 4 dígitos de la propia cuenta.
// Se llega acá forzado tras entrar con un PIN temporal (recuperación), o
// voluntariamente desde el Perfil ("Activar acceso con PIN").
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NuevoPin() {
  const { usuario, signOut } = useAuth();
  const [codigo, setCodigo] = useState('51');
  const [numero, setNumero] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [correo, setCorreo] = useState('');
  const [correo2, setCorreo2] = useState('');
  const [temporal, setTemporal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const estado = await miEstadoPin();
      setTemporal(!!estado.pin_temporal);
      const raw = estado.telefono ?? usuario?.telefono ?? '';
      if (raw) {
        const { codigo: c, numero: n } = separarTelefono(raw);
        setCodigo(c);
        setNumero(n);
      }
      setCargando(false);
    })();
  }, [usuario?.telefono]);

  const guardar = async () => {
    setError(null);
    if (!numero.trim()) {
      setError('Escribe tu número de teléfono.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('El PIN debe ser de 4 dígitos.');
      return;
    }
    if (pin !== pin2) {
      setError('Los dos PIN no coinciden.');
      return;
    }
    const correoLimpio = correo.trim().toLowerCase();
    if (correoLimpio && !RE_EMAIL.test(correoLimpio)) {
      setError('El correo no es válido. Déjalo vacío si no quieres agregarlo ahora.');
      return;
    }
    if (correoLimpio && correoLimpio !== correo2.trim().toLowerCase()) {
      setError('Los dos correos no coinciden. Escríbelo igual en ambos campos.');
      return;
    }
    setGuardando(true);
    try {
      await definirMiPin(telefonoCompleto(codigo, numero), pin);
      // Correo opcional: si lo puso, se vincula ahora (ya hay sesión). Si
      // esto falla, el PIN ya quedó guardado -- se avisa y puede reintentar
      // o dejar el correo vacío; lo agregará luego desde su Perfil.
      if (correoLimpio) {
        await vincularCorreoSesion(correoLimpio);
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el PIN.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>{temporal ? 'Crea tu PIN definitivo' : 'Crear / cambiar tu PIN'}</Text>
      <Text style={styles.texto}>
        {temporal
          ? 'Entraste con un PIN temporal. Define ahora tu PIN de 4 dígitos: es el que usarás para entrar con tu número de teléfono.'
          : 'Con este PIN podrás entrar con tu número de teléfono, además de "Continuar con Google".'}
      </Text>

      <Text style={styles.label}>País y número de teléfono</Text>
      <TelefonoInput codigo={codigo} onCodigo={setCodigo} numero={numero} onNumero={setNumero} />

      <Text style={styles.label}>Nuevo PIN (4 dígitos)</Text>
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

      {esCorreoPinSintetico(usuario?.email) && (
        <>
          <Text style={styles.label}>Correo (opcional)</Text>
          <TextInput
            style={styles.input}
            value={correo}
            onChangeText={(t) => setCorreo(t.replace(/\s/g, ''))}
            placeholder="tucorreo@gmail.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
          />
          <TextInput
            style={styles.input}
            value={correo2}
            onChangeText={(t) => setCorreo2(t.replace(/\s/g, ''))}
            placeholder="Repite tu correo"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
          />
          {correo2.trim().length > 0 && (
            <Text style={correo.trim().toLowerCase() === correo2.trim().toLowerCase() ? styles.okCorreo : styles.error}>
              {correo.trim().toLowerCase() === correo2.trim().toLowerCase()
                ? '✓ Los dos correos coinciden.'
                : 'Los dos correos aún no coinciden.'}
            </Text>
          )}
          <Text style={styles.texto}>
            Con tu correo podrás entrar también con «Continuar con Google». Debe ser válido y tuyo: Google te
            pedirá su contraseña, que es privada y solo tú la conoces. Puedes dejarlo vacío y agregarlo luego
            desde tu Perfil.
          </Text>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.boton} onPress={guardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.botonTexto}>Guardar PIN</Text>}
      </Pressable>

      <Pressable onPress={temporal ? signOut : () => router.replace('/')}>
        <Text style={styles.secundario}>{temporal ? 'Cancelar y salir' : 'Ahora no'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, paddingBottom: 40, justifyContent: 'center', gap: 4 },
  titulo: { color: colors.text, fontSize: 24, fontWeight: '800' },
  texto: { color: colors.textMuted, fontSize: 15, lineHeight: 20, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 10 },
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
  error: { color: colors.danger, fontSize: 15, marginTop: 10 },
  okCorreo: { color: colors.success, fontSize: 14, fontWeight: '600', marginTop: 6 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 16 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 17 },
  secundario: { color: colors.accent, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 14 },
});
