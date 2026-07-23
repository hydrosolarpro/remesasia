import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Ingresar' }} />
      <Stack.Screen name="verify" options={{ title: 'Verificar código' }} />
      <Stack.Screen name="pendiente-alta" options={{ title: 'Cuenta en revisión', headerBackVisible: false }} />
    </Stack>
  );
}
