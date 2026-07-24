import { Stack } from 'expo-router';
import { colors, APP_MAX_WIDTH_MEDIUM } from '../../constants/theme';
import { BannerTitle, BannerFlags } from '../../components/AppBanner';
import { NarrowShell } from '../../components/NarrowShell';

export default function AdminLayout() {
  return (
    <NarrowShell maxWidth={APP_MAX_WIDTH_MEDIUM}>
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
        <Stack.Screen name="index" options={{ headerBackVisible: false }} />
        <Stack.Screen name="panel-control" options={{ title: 'Panel de control' }} />
      </Stack>
    </NarrowShell>
  );
}
