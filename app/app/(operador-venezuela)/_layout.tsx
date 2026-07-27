import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { colors } from '../../constants/theme';
import { BannerTitle, BannerFlags } from '../../components/AppBanner';
import { TabBarIcon } from '../../components/TabBarIcon';

const ICONO = { index: '📋', estadisticas: '📊', perfil: '👤' };

function TabIcon({ nombre, color, focused }: { nombre: keyof typeof ICONO; color: ColorValue; focused: boolean }) {
  return <TabBarIcon emoji={ICONO[nombre]} color={color} focused={focused} />;
}

export default function OperadorVenezuelaLayout() {
  // React Navigation reserva ~28px fijos para el ícono de cada tab más su
  // propio padding interno (5px arriba/abajo, aparte del padding del
  // tabBarStyle) — con 62px de alto casi no quedaba espacio y el navegador
  // comprimía la etiqueta de texto a ~5px (se veía cortada). 84px le da
  // aire de sobra. El inset se suma aparte para el indicador de inicio
  // (iPhone) o la barra de gestos (Android).
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitle: () => <BannerTitle />,
        headerRight: () => <BannerFlags />,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 84 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 10 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Panel', tabBarIcon: ({ color, focused }) => <TabIcon nombre="index" color={color} focused={focused} /> }}
      />
      <Tabs.Screen
        name="estadisticas"
        options={{
          title: 'Estadísticas',
          tabBarIcon: ({ color, focused }) => <TabIcon nombre="estadisticas" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ color, focused }) => <TabIcon nombre="perfil" color={color} focused={focused} /> }}
      />
      {/* Cerrar sesión vive en la propia barra de tabs para que sea más
          visible. No navega: intercepta el toque y cierra sesión ahí
          mismo (ver cerrar-sesion.tsx, que solo es un respaldo). */}
      <Tabs.Screen
        name="cerrar-sesion"
        options={{
          title: 'Salir',
          tabBarIcon: ({ focused }) => <TabBarIcon emoji="🚪" color={colors.danger} focused={focused} peligro />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            signOut();
          },
        }}
      />
    </Tabs>
  );
}
