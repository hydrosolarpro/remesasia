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
  // Sin sumar el inset inferior, en celulares con indicador de inicio o
  // barra de gestos la altura fija de 62 no alcanza y el sistema tapa la
  // fila de tabs, dejando el último botón de cada pantalla cortado encima.
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
          height: 62 + insets.bottom,
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
