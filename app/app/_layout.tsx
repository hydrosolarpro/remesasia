import { Stack } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { colors, APP_MAX_WIDTH } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        {/* En pantallas anchas (web/tablet) la app se centra como un "shell" de
            ancho móvil; en celulares el viewport ya es menor a APP_MAX_WIDTH,
            así que esto no cambia nada ahí. */}
        <View style={styles.outer}>
          <View style={[styles.shell, Platform.OS === 'web' ? webShellShadow : null]}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '700' },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(cliente)" options={{ headerShown: false }} />
              <Stack.Screen name="(operador-peru)" options={{ headerShown: false }} />
              <Stack.Screen name="(operador-venezuela)" options={{ headerShown: false }} />
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
    maxWidth: APP_MAX_WIDTH,
    backgroundColor: colors.bg,
  },
});
