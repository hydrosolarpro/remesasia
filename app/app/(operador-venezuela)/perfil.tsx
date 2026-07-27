import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { colors } from '../../constants/theme';

export default function Perfil() {
  const { usuario } = useAuth();

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  return (
    <View style={styles.container}>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Operador Venezuela'}</Text>
      <Text style={styles.email}>{usuario?.email}</Text>
      <Text style={styles.telefono}>{usuario?.telefono}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 8 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 14, marginTop: -4 },
  telefono: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
});
