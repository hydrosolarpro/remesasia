import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../constants/theme';

// No debería llegar a montarse en uso normal: el tab "Salir" intercepta el
// toque (ver listeners.tabPress en _layout.tsx) y cierra sesión sin
// navegar aquí. Esta pantalla es solo un respaldo por si esa
// intercepción falla.
export default function CerrarSesion() {
  const { signOut } = useAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    signOut();
  }, []);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
});
