import { Tabs } from 'expo-router';
import { Text, ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { BannerTitle, BannerFlags } from '../../components/AppBanner';

const ICONO = { index: '📋', estadisticas: '📊', perfil: '👤' };

function TabIcon({ nombre, color }: { nombre: keyof typeof ICONO; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{ICONO[nombre]}</Text>;
}

export default function OperadorVenezuelaLayout() {
  // React Navigation reserva ~28px fijos para el ícono de cada tab más su
  // propio padding interno (5px arriba/abajo, aparte del padding del
  // tabBarStyle) — con 62px de alto casi no quedaba espacio y el navegador
  // comprimía la etiqueta de texto a ~5px (se veía cortada). 84px le da
  // aire de sobra. El inset se suma aparte para el indicador de inicio
  // (iPhone) o la barra de gestos (Android).
  const insets = useSafeAreaInsets();
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
      <Tabs.Screen name="index" options={{ title: 'Panel', tabBarIcon: ({ color }) => <TabIcon nombre="index" color={color} /> }} />
      <Tabs.Screen
        name="estadisticas"
        options={{ title: 'Estadísticas', tabBarIcon: ({ color }) => <TabIcon nombre="estadisticas" color={color} /> }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon nombre="perfil" color={color} /> }} />
    </Tabs>
  );
}
