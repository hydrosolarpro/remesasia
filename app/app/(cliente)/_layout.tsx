import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useAlertaSonora } from '../../lib/useAlertaSonora';
import { colors, APP_MAX_WIDTH_MEDIUM } from '../../constants/theme';
import { BannerTitle, BannerFlags } from '../../components/AppBanner';
import { NarrowShell } from '../../components/NarrowShell';
import { TabBarIcon } from '../../components/TabBarIcon';
import { AccesoNegocioGate } from '../../components/AccesoNegocioGate';

const ICONO = {
  index: '🏠',
  solicitudes: '📋',
  'cuentas-utilizadas': '💳',
  conversor: '💱',
  estadisticas: '📊',
  perfil: '👤',
};

function TabIcon({ nombre, color, focused }: { nombre: keyof typeof ICONO; color: ColorValue; focused: boolean }) {
  return <TabBarIcon emoji={ICONO[nombre]} color={color} focused={focused} />;
}

export default function ClienteLayout() {
  // React Navigation reserva ~28px fijos para el ícono de cada tab más su
  // propio padding interno (5px arriba/abajo, aparte del padding del
  // tabBarStyle) — con 62px de alto casi no quedaba espacio y el navegador
  // comprimía la etiqueta de texto a ~5px (se veía cortada). 84px le da
  // aire de sobra. El inset se suma aparte para el indicador de inicio
  // (iPhone) o la barra de gestos (Android).
  const insets = useSafeAreaInsets();
  const { usuario, signOut } = useAuth();

  // Alerta sonora de una sola vez (no se repite, el cliente no tiene
  // ningún check que atender) cuando se confirma el depósito en
  // Venezuela de alguna de sus solicitudes. Vive en el layout -- no en
  // una pantalla puntual -- para sonar sin importar en qué pestaña esté.
  const reproducirAlerta = useAlertaSonora();
  const completadosConocidosRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;

    const revisarCompletados = async () => {
      const { data } = await supabase.from('solicitudes').select('id').eq('cliente_id', usuario.id).eq('check_deposito_ve', true);
      if (cancelado) return;
      const completadosAhora = new Set((data ?? []).map((d) => d.id as string));
      if (completadosConocidosRef.current === null) {
        completadosConocidosRef.current = completadosAhora;
        return;
      }
      const hayNuevo = [...completadosAhora].some((id) => !completadosConocidosRef.current!.has(id));
      if (hayNuevo) reproducirAlerta();
      completadosConocidosRef.current = completadosAhora;
    };

    revisarCompletados();
    const channel = supabase
      .channel(`cliente-alertas-${usuario.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes', filter: `cliente_id=eq.${usuario.id}` },
        () => revisarCompletados()
      )
      .subscribe();

    return () => {
      cancelado = true;
      supabase.removeChannel(channel);
    };
  }, [usuario, reproducirAlerta]);

  return (
    <NarrowShell maxWidth={APP_MAX_WIDTH_MEDIUM}>
      <AccesoNegocioGate operadorPeruId={usuario?.negocio_operador_peru_id} rolParaAviso="cliente">
      <Tabs
        screenOptions={{
          // 76px para que las banderas x3 (66x45) entren con aire; el
          // header nativo por default (44/56) las recortaba.
          headerStyle: { backgroundColor: colors.card, height: 76 },
          headerTintColor: colors.text,
          headerTitle: () => <BannerTitle />,
          headerRight: () => <BannerFlags />,
          headerShadowVisible: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 84 + insets.bottom,
            paddingTop: 8,
            paddingBottom: 10 + insets.bottom,
          },
          // 6 pestañas en la misma barra (una más que operador Perú/Venezuela):
          // con el tamaño de fuente y padding lateral por defecto, etiquetas
          // como "Estadísticas" no entraban en su columna y React Navigation
          // las cortaba con "...". Fuente más chica + sin padding lateral del
          // ítem le da a cada etiqueta todo el ancho de su columna.
          tabBarItemStyle: { paddingHorizontal: 0 },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Inicio', tabBarIcon: ({ color, focused }) => <TabIcon nombre="index" color={color} focused={focused} /> }}
        />
        <Tabs.Screen
          name="solicitudes"
          options={{
            title: 'Solicitudes',
            tabBarIcon: ({ color, focused }) => <TabIcon nombre="solicitudes" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="cuentas-utilizadas"
          options={{
            title: 'Mis cuentas',
            tabBarIcon: ({ color, focused }) => <TabIcon nombre="cuentas-utilizadas" color={color} focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="conversor"
          options={{
            title: 'Conversor',
            tabBarIcon: ({ color, focused }) => <TabIcon nombre="conversor" color={color} focused={focused} />,
          }}
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
        <Tabs.Screen name="solicitud/[id]" options={{ title: 'Detalle de solicitud', href: null }} />
      </Tabs>
      </AccesoNegocioGate>
    </NarrowShell>
  );
}
