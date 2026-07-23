import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';

export default function OperadorPeruLayout() {
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
      <Tabs.Screen name="solicitudes" options={{ title: 'Solicitudes' }} />
      <Tabs.Screen name="tasa" options={{ title: 'Tasa del día' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="solicitud/[id]" options={{ title: 'Solicitud', href: null }} />
      <Tabs.Screen name="chat/[solicitudId]" options={{ title: 'Chat con Venezuela', href: null }} />
    </Tabs>
  );
}
