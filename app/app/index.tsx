import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { canjearInvitacion, leerTokenPendiente, limpiarTokenPendiente } from '../lib/invitaciones';
import { Usuario } from '../types/database';
import { colors } from '../constants/theme';

export default function Index() {
  const { session, usuario, loading, refreshUsuario } = useAuth();
  const [destino, setDestino] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(true);
  const [errorDebug, setErrorDebug] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !usuario) {
      setResolviendo(false);
      return;
    }

    let cancelado = false;
    (async () => {
      setResolviendo(true);
      let usuarioActual = usuario;

      // 1. Intentar vincular cuenta si era un operador pre-registrado
      try {
        const { data: nuevoRol, error: rpcError } = await supabase.rpc('vincular_cuenta_pendiente');
        console.log('Resultado vinculación:', { nuevoRol, rpcError });

        if (nuevoRol && nuevoRol !== usuario.rol) {
          await refreshUsuario();
          const { data: u } = await supabase.from('usuarios').select('*').eq('id', usuario.id).single();
          if (u) usuarioActual = u as Usuario;
        } else if (!nuevoRol && usuarioActual.rol === 'cliente') {
          // DEBUG: Esto nos dirá si falló la vinculación
          if (!cancelado) {
            setErrorDebug(
              `Rol sigue como cliente. Usuario ID: ${usuario.id}. Asegúrate que tu correo coincida en la tabla "operador_peru_miembro" o "operador_venezuela_perfil".`
            );
            setResolviendo(false);
          }
          return;
        }
      } catch (e) {
        console.error('Error en vinculación automática:', e);
      }

      // 2. Si veníamos de un enlace de invitación (token guardado antes del
      // login con Google), canjéalo ahora que ya hay sesión. El token solo
      // se limpia de AsyncStorage si el canje fue exitoso (resultado.ok) --
      // si falla (cupo de clientes alcanzado, invitación ya usada, error de
      // red) se deja guardado para reintentar en el próximo ingreso, en vez
      // de perderlo y dejar al cliente registrado pero sin negocio
      // vinculado, invisible para su operador.
      const tokenPendiente = await leerTokenPendiente();
      if (tokenPendiente) {
        try {
          const resultado = await canjearInvitacion(tokenPendiente);
          if (resultado.ok) {
            await limpiarTokenPendiente();
            const { data } = await supabase.from('usuarios').select('*').eq('id', usuario.id).single();
            if (data) usuarioActual = data as Usuario;
            await refreshUsuario();
          } else {
            console.error('No se pudo canjear la invitación pendiente:', resultado.error);
          }
        } catch (err) {
          console.error('Error canjeando invitación pendiente:', err);
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

  if (errorDebug) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>{errorDebug}</Text>
      </View>
    );
  }

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
