import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { colors } from '../../constants/theme';

export default function Perfil() {
  const { usuario, signOut } = useAuth();

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  return (
    <View style={styles.container}>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Cliente'}</Text>
      <Text style={styles.telefono}>{usuario?.telefono}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 8 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: '800' },
  telefono: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  button: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.danger, fontWeight: '700' },
});
