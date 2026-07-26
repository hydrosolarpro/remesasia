import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { canjearInvitacion, leerYLimpiarTokenPendiente } from '../lib/invitaciones';
import { Usuario } from '../types/database';
import { colors } from '../constants/theme';

export default function Index() {
  const { session, usuario, loading, refreshUsuario } = useAuth();
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

      // Si veníamos de un enlace de invitación (token guardado antes del
      // login con Google), canjéalo ahora que ya hay sesión, y lee el
      // usuario en fresco (el rol/negocio pudo haber cambiado) antes de
      // decidir a dónde enrutar.
      const tokenPendiente = await leerYLimpiarTokenPendiente();
      let usuarioActual = usuario;
      if (tokenPendiente) {
        try {
          await canjearInvitacion(tokenPendiente);
          const { data } = await supabase.from('usuarios').select('*').eq('id', usuario.id).single();
          if (data) usuarioActual = data as Usuario;
          await refreshUsuario();
        } catch {
          // Invitación inválida/usada: seguimos con el usuario tal cual estaba.
        }
      }

      let ruta: string;

      if (usuarioActual.rol === 'administrador') {
        ruta = '/(admin)';
      } else if (usuarioActual.rol === 'cliente') {
        // Primera vez: sin teléfono todavía -> falta el registro corto.
        ruta = usuarioActual.telefono ? '/(cliente)' : '/(auth)/registro';
      } else if (usuarioActual.rol === 'operador_peru') {
        const { data } = await supabase
          .from('perfil_negocio')
          .select('id')
          .eq('operador_peru_id', usuarioActual.id)
          .maybeSingle();
        ruta = data ? '/(operador-peru)' : '/(operador-peru)/onboarding';
      } else if (usuarioActual.rol === 'operador_peru_miembro') {
        // Miembro de equipo: entra directo al panel del negocio al que
        // pertenece, sin pasar por onboarding (eso es solo del dueño) ni
        // por el candado de suscripción (ver SuscripcionGate).
        ruta = '/(operador-peru)';
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
