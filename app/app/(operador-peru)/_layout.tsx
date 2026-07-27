import { Tabs } from 'expo-router';
import { View, ColorValue, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { colors } from '../../constants/theme';
import { GroupHeader } from '../../components/GroupHeader';
import { SuscripcionGate } from '../../components/SuscripcionGate';
import { TabBarIcon } from '../../components/TabBarIcon';

const ICONO = {
  index: '📋',
  tasa: '💱',
  estadisticas: '📊',
  clientes: '👥',
  perfil: '👤',
};

function TabIcon({ nombre, color, focused }: { nombre: keyof typeof ICONO; color: ColorValue; focused: boolean }) {
  return <TabBarIcon emoji={ICONO[nombre]} color={color} focused={focused} />;
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
  const { signOut } = useAuth();
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
          <Tabs.Screen
            name="index"
            options={{ title: 'Panel', tabBarIcon: ({ color, focused }) => <TabIcon nombre="index" color={color} focused={focused} /> }}
          />
          {/* Ya no va en la barra de tabs: se sigue accediendo desde el
              enlace "Actualizar tasa →" del Panel (PeruDashboardView). */}
          <Tabs.Screen name="tasa" options={{ title: 'Tasa del día', href: null }} />
          <Tabs.Screen
            name="estadisticas"
            options={{
              title: 'Estadísticas',
              tabBarIcon: ({ color, focused }) => <TabIcon nombre="estadisticas" color={color} focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="clientes"
            options={{ title: 'Clientes', tabBarIcon: ({ color, focused }) => <TabIcon nombre="clientes" color={color} focused={focused} /> }}
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
          <Tabs.Screen name="onboarding" options={{ title: 'Datos del negocio', href: null }} />
        </Tabs>
      </SuscripcionGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
