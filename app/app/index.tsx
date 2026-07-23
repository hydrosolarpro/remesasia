import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors } from '../constants/theme';

const HOME_POR_ROL: Record<string, string> = {
  cliente: '/(cliente)/calculadora',
  operador_peru: '/(operador-peru)/solicitudes',
  operador_venezuela: '/(operador-venezuela)/solicitudes',
};

export default function Index() {
  const { session, usuario, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!usuario) {
    // Sesión válida pero sin fila en `usuarios` todavía (alta pendiente por Operador Perú).
    return <Redirect href="/(auth)/pendiente-alta" />;
  }

  return <Redirect href={HOME_POR_ROL[usuario.rol] as never} />;
}
