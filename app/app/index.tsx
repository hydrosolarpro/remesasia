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
           setDestino(`ERROR: Rol sigue como cliente. Usuario ID: ${usuario.id}. Asegúrate que tu correo coincida en la tabla "operador_peru_miembro"`);
           setResolviendo(false);
           return;
        }
      } catch (e) {
        console.error('Error en vinculación automática:', e);
      }

      // 2. Si veníamos de un enlace de invitación (token guardado antes del
      // login con Google), canjéalo ahora que ya hay sesión...
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
