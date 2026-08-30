import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { colors, APP_MAX_WIDTH_WIDE } from '../constants/theme';
import { BannerTitle, BannerFlags } from '../components/AppBanner';

// En web añadimos a mano el <head> que la plantilla por defecto de Expo no
// trae. Clave para el problema de "me cierra la sesión en el acceso directo
// del celular": con `apple-mobile-web-app-capable = no` y un manifest con
// `display: browser`, el ícono que se agrega a la pantalla de inicio abre
// el sitio DENTRO del navegador (Safari/Chrome) en vez de en una ventana
// aislada. Así comparte el almacenamiento y la sesión con el navegador, y
// el redirect de Google al iniciar sesión vuelve al mismo contexto en vez
// de perderse.
function useWebHeadTags() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const set = (
      tag: 'meta' | 'link',
      attrs: Record<string, string>,
      matchKey: string,
    ) => {
      const selector = `${tag}[${matchKey}="${attrs[matchKey]}"]`;
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = document.createElement(tag);
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    };
    set('link', { rel: 'manifest', href: '/manifest.json' }, 'rel');
    set('link', { rel: 'apple-touch-icon', href: '/app-icon.png' }, 'rel');
    set('meta', { name: 'apple-mobile-web-app-capable', content: 'no' }, 'name');
    set('meta', { name: 'mobile-web-app-capable', content: 'no' }, 'name');
    set('meta', { name: 'theme-color', content: '#0A0E1B' }, 'name');
    set('meta', { name: 'apple-mobile-web-app-title', content: 'Remesas IA' }, 'name');
  }, []);
}

export default function RootLayout() {
  useWebHeadTags();
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
                // Este header nunca se renderiza en la práctica: todas las
                // pantallas hijas lo tapan con headerShown:false y usan su
                // propio header (Tabs de cada sesión, con su propia altura
                // para las banderas x3). native-stack tampoco permite
                // `height` en headerStyle (solo backgroundColor).
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
