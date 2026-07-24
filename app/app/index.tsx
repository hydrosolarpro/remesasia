import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { colors } from '../constants/theme';

export default function Index() {
  const { session, usuario, loading } = useAuth();
  const [destino, setDestino] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(true);

  useEffect(() => {
    if (loading || !usuario) {
      setResolviendo(false);
      return;
    }

    let cancelado = false;
    (async () => {
      setResolviendo(true);
      let ruta: string;

      if (usuario.rol === 'cliente') {
        // Primera vez: sin teléfono todavía -> falta el registro corto.
        ruta = usuario.telefono ? '/(cliente)' : '/(auth)/registro';
      } else if (usuario.rol === 'operador_peru') {
        const { data } = await supabase
          .from('perfil_negocio')
          .select('id')
          .eq('operador_peru_id', usuario.id)
          .maybeSingle();
        ruta = data ? '/(operador-peru)' : '/(operador-peru)/onboarding';
      } else {
        ruta = '/(operador-venezuela)';
      }

      if (!cancelado) {
        setDestino(ruta);
        setResolviendo(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [loading, usuario]);

  if (loading || resolviendo) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={(destino ?? '/(auth)/login') as never} />;
}
