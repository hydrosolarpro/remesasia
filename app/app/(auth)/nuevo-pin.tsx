import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { miEstadoPin, definirMiPin } from '../../lib/pinAuth';
import { TelefonoInput, telefonoCompleto, separarTelefono } from '../../components/TelefonoInput';
import { colors, radius } from '../../constants/theme';

// Pantalla para crear / cambiar el PIN de 4 dígitos de la propia cuenta.
// Se llega acá forzado tras entrar con un PIN temporal (recuperación), o
// voluntariamente desde el Perfil ("Activar acceso con PIN").
export default function NuevoPin() {
  const { usuario, signOut } = useAuth();
  const [codigo, setCodigo] = useState('51');
  const [numero, setNumero] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
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
    setGuardando(true);
    try {
      await definirMiPin(telefonoCompleto(codigo, numero), pin);
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
  boton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 16 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 17 },
  secundario: { color: colors.accent, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 14 },
});
