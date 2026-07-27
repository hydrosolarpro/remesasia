import { Tabs } from 'expo-router';
import { Text, View, ColorValue, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { GroupHeader } from '../../components/GroupHeader';
import { SuscripcionGate } from '../../components/SuscripcionGate';

const ICONO = {
  index: '📋',
  tasa: '💱',
  estadisticas: '📊',
  clientes: '👥',
  perfil: '👤',
};

function TabIcon({ nombre, color }: { nombre: keyof typeof ICONO; color: ColorValue }) {
  return <Text style={{ fontSize: 18, color }}>{ICONO[nombre]}</Text>;
}

// El banner vive un nivel arriba de <Tabs> (ver GroupHeader) porque el
// gate de suscripción decide si se muestra Tabs o la pantalla de pago —
// así el banner queda visible en ambos casos.
export default function OperadorPeruLayout() {
  // React Navigation reserva ~28px fijos para el ícono de cada tab más su
  // propio padding interno (5px arriba/abajo, aparte del padding del
  // tabBarStyle) — con 62px de alto casi no quedaba espacio y el navegador
  // comprimía la etiqueta de texto a ~5px (se veía cortada). 84px le da
  // aire de sobra. El inset se suma aparte para el indicador de inicio
  // (iPhone) o la barra de gestos (Android).
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <GroupHeader />
      <SuscripcionGate>
        <Tabs
          screenOptions={{
            headerShown: false,
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
          {/* Ya no va en la barra de tabs: se sigue accediendo desde el
              enlace "Actualizar tasa →" del Panel (PeruDashboardView). */}
          <Tabs.Screen name="tasa" options={{ title: 'Tasa del día', href: null }} />
          <Tabs.Screen
            name="estadisticas"
            options={{ title: 'Estadísticas', tabBarIcon: ({ color }) => <TabIcon nombre="estadisticas" color={color} /> }}
          />
          <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: ({ color }) => <TabIcon nombre="clientes" color={color} /> }} />
          <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <TabIcon nombre="perfil" color={color} /> }} />
          <Tabs.Screen name="onboarding" options={{ title: 'Datos del negocio', href: null }} />
        </Tabs>
      </SuscripcionGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
