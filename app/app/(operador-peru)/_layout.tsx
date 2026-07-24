import { Tabs } from 'expo-router';
import { Text, View, ColorValue, StyleSheet } from 'react-native';
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
              height: 62,
              paddingTop: 8,
              paddingBottom: 10,
            },
            tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Panel', tabBarIcon: ({ color }) => <TabIcon nombre="index" color={color} /> }} />
          <Tabs.Screen name="tasa" options={{ title: 'Tasa del día', tabBarIcon: ({ color }) => <TabIcon nombre="tasa" color={color} /> }} />
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
