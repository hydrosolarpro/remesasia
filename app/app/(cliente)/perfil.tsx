import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { colors, radius } from '../../constants/theme';

export default function Perfil() {
  const { usuario } = useAuth();

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  return (
    <View style={styles.container}>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Cliente'}</Text>
      <Text style={styles.dato}>{usuario?.email}</Text>
      <Text style={styles.dato}>{usuario?.telefono}</Text>
      <Text style={styles.datoUltimo}>{usuario?.pais}</Text>

      <Pressable style={styles.buttonOutline} onPress={() => router.push('/(auth)/registro')}>
        <Text style={styles.buttonOutlineText}>Editar mis datos</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: '800' },
  dato: { color: colors.textMuted, fontSize: 14, marginTop: -8 },
  datoUltimo: { color: colors.textMuted, fontSize: 14, marginTop: -8, marginBottom: 12 },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
});
