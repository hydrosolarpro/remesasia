import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../constants/theme';

// Registro de cliente, primera vez que inicia sesión: nombre completo,
// teléfono y país. El email ya llegó de Google.
export default function Registro() {
  const { usuario, refreshUsuario } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [pais, setPais] = useState(usuario?.pais ?? 'Perú');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setError(null);
    if (!nombre.trim() || !apellido.trim() || !telefono.trim() || !pais.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ nombre: `${nombre.trim()} ${apellido.trim()}`, telefono: telefono.trim(), pais: pais.trim() })
      .eq('id', usuario!.id);
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshUsuario();
    router.replace('/(cliente)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Completa tu registro</Text>
      <Text style={styles.subtitle}>Solo lo pedimos una vez.</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Tu nombre"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Apellido</Text>
      <TextInput
        style={styles.input}
        value={apellido}
        onChangeText={setApellido}
        placeholder="Tu apellido"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Teléfono</Text>
      <TextInput
        style={styles.input}
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
        placeholder="+51 999 999 999"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>País</Text>
      <TextInput
        style={styles.input}
        value={pais}
        onChangeText={setPais}
        placeholder="Perú"
        placeholderTextColor={colors.textMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={guardar} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Guardar y continuar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 4 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    marginTop: 6,
    backgroundColor: colors.card,
  },
  error: { color: colors.danger, marginTop: 14, fontSize: 13 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
