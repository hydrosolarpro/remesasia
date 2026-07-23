import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';

export default function OperadorVenezuelaLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="solicitudes" options={{ title: 'Solicitudes' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="solicitud/[id]" options={{ title: 'Solicitud', href: null }} />
      <Tabs.Screen name="chat/[solicitudId]" options={{ title: 'Chat con Perú', href: null }} />
    </Tabs>
  );
}
