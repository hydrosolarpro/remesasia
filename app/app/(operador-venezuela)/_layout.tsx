import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { ColorValue, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/theme';
import { BannerTitle, BannerFlags } from '../../components/AppBanner';
import { TabBarIcon } from '../../components/TabBarIcon';
import { AccesoNegocioGate } from '../../components/AccesoNegocioGate';
import { PlanBadge } from '../../components/PlanBadge';

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
  const { usuario, signOut } = useAuth();

  const [operadorPeruId, setOperadorPeruId] = useState<string | null>(null);
  useEffect(() => {
    if (!usuario) return;
    supabase
      .from('operador_venezuela_perfil')
      .select('operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => setOperadorPeruId(data?.operador_peru_id ?? null));
  }, [usuario]);

  return (
    <AccesoNegocioGate operadorPeruId={operadorPeruId} rolParaAviso="operador_venezuela">
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitle: () => <BannerTitle />,
        headerRight: () => (
          <View>
            <BannerFlags />
            <PlanBadge operadorPeruId={operadorPeruId} />
          </View>
        ),
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
    </AccesoNegocioGate>
  );
}
