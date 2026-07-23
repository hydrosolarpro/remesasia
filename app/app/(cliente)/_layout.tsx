import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';

export default function ClienteLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
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
      <Tabs.Screen name="calculadora" options={{ title: 'Calculadora' }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="nueva-solicitud" options={{ title: 'Nueva solicitud', href: null }} />
      <Tabs.Screen name="solicitud/[id]" options={{ title: 'Detalle de solicitud', href: null }} />
    </Tabs>
  );
}
