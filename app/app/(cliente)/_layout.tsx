import { Tabs } from 'expo-router';
import { Text, ColorValue } from 'react-native';
import { colors, APP_MAX_WIDTH_MEDIUM } from '../../constants/theme';
import { BannerTitle, BannerFlags } from '../../components/AppBanner';
import { NarrowShell } from '../../components/NarrowShell';

const ICONO = {
  index: '🏠',
  'cuentas-utilizadas': '💳',
  estadisticas: '📊',
  perfil: '👤',
};

function TabIcon({ nombre, color }: { nombre: keyof typeof ICONO; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{ICONO[nombre]}</Text>;
}

export default function ClienteLayout() {
  return (
    <NarrowShell maxWidth={APP_MAX_WIDTH_MEDIUM}>
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
            height: 62,
            paddingTop: 8,
            paddingBottom: 10,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <TabIcon nombre="index" color={color} /> }} />
        <Tabs.Screen
          name="cuentas-utilizadas"
          options={{ title: 'Mis cuentas', tabBarIcon: ({ color }) => <TabIcon nombre="cuentas-utilizadas" color={color} /> }}
        />
        <Tabs.Screen
          name="estadisticas"
          options={{ title: 'Estadísticas', tabBarIcon: ({ color }) => <TabIcon nombre="estadisticas" color={color} /> }}
        />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon nombre="perfil" color={color} /> }} />
        <Tabs.Screen name="solicitud/[id]" options={{ title: 'Detalle de solicitud', href: null }} />
      </Tabs>
    </NarrowShell>
  );
}
