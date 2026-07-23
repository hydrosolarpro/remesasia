import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../constants/theme';

export default function PendienteAlta() {
  const { signOut, refreshUsuario } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cuenta en revisión</Text>
      <Text style={styles.text}>
        Tu número ya está verificado. El Operador Perú debe asignarte un rol (cliente, operador Perú u
        operador Venezuela) antes de que puedas continuar.
      </Text>
      <Pressable style={styles.button} onPress={refreshUsuario}>
        <Text style={styles.buttonText}>Ya me asignaron un rol</Text>
      </Pressable>
      <Pressable style={styles.linkButton} onPress={signOut}>
        <Text style={styles.linkText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center', gap: 16 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '700' },
  linkButton: { alignItems: 'center', padding: 10 },
  linkText: { color: colors.textMuted, fontSize: 13 },
});
