import { Stack } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { colors, APP_MAX_WIDTH_WIDE } from '../constants/theme';
import { BannerTitle, BannerFlags } from '../components/AppBanner';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        {/* Shell general: el ancho máximo que necesita cualquier sección
            (operador). auth/cliente lo angostan más adentro de su propio
            grupo (ver sus _layout.tsx) porque son flujos de una columna. En
            celulares el viewport ya es menor a cualquiera de estos valores,
            así que nada de esto cambia algo ahí. */}
        <View style={styles.outer}>
          <View style={[styles.shell, Platform.OS === 'web' ? webShellShadow : null]}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerTitle: () => <BannerTitle />,
                headerRight: () => <BannerFlags />,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(cliente)" options={{ headerShown: false }} />
              <Stack.Screen name="(operador-peru)" options={{ headerShown: false }} />
              <Stack.Screen name="(operador-venezuela)" options={{ headerShown: false }} />
              <Stack.Screen name="(admin)" options={{ headerShown: false }} />
              <Stack.Screen name="invitacion/[token]" options={{ headerShown: false }} />
            </Stack>
          </View>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// boxShadow es una extensión de react-native-web sin tipos en ViewStyle nativo;
// se aplica aparte para no romper el StyleSheet.create tipado de abajo.
const webShellShadow = { boxShadow: '0 0 60px rgba(108, 92, 231, 0.12)' } as object;

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#05070E' : colors.bg,
    alignItems: 'center',
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: APP_MAX_WIDTH_WIDE,
    backgroundColor: colors.bg,
  },
});
