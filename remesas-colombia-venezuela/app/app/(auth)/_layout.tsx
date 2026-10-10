import { Stack } from 'expo-router';
import { colors, APP_MAX_WIDTH_NARROW } from '../../constants/theme';
import { BannerTitle, BannerFlags } from '../../components/AppBanner';
import { NarrowShell } from '../../components/NarrowShell';

export default function AuthLayout() {
  return (
    <NarrowShell maxWidth={APP_MAX_WIDTH_NARROW}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitle: () => <BannerTitle />,
          headerRight: () => <BannerFlags />,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="login" options={{ headerBackVisible: false }} />
        <Stack.Screen name="registro" options={{ headerBackVisible: false }} />
        <Stack.Screen name="nuevo-pin" options={{ headerBackVisible: false }} />
      </Stack>
    </NarrowShell>
  );
}
