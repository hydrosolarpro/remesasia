import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { canjearInvitacion, leerTokenPendiente, limpiarTokenPendiente } from '../lib/invitaciones';
import { Usuario } from '../types/database';
import { colors, radius } from '../constants/theme';

export default function Index() {
  const { session, usuario, loading, refreshUsuario, signOut } = useAuth();
  const [destino, setDestino] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(true);
  // El usuario entró con Google pero su cuenta no está asociada a ningún
  // operador (nunca abrió un enlace de invitación). No debe ver el
  // formulario de registro -- solo un cliente invitado llega a /registro.
  const [sinInvitacion, setSinInvitacion] = useState(false);

  useEffect(() => {
    if (loading || !usuario) {
      setResolviendo(false);
      return;
    }

    let cancelado = false;
    (async () => {
      setResolviendo(true);
      setSinInvitacion(false);
      let usuarioActual = usuario;

      // 1. Intentar vincular cuenta si era un operador pre-registrado (por
      //    correo, en operador_peru_miembro / operador_venezuela_perfil).
      try {
        const { data: nuevoRol } = await supabase.rpc('vincular_cuenta_pendiente');
        if (nuevoRol && nuevoRol !== usuario.rol) {
          await refreshUsuario();
          const { data: u } = await supabase.from('usuarios').select('*').eq('id', usuario.id).single();
          if (u) usuarioActual = u as Usuario;
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
        if (!usuarioActual.negocio_operador_peru_id) {
          // Cliente sin operador: entró con Google sin pasar por un enlace
          // de invitación. No se le muestra /registro.
          if (!cancelado) {
            setSinInvitacion(true);
            setResolviendo(false);
          }
          return;
        }
        // Cliente invitado: si aún no tiene teléfono, falta el registro corto.
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

  if (sinInvitacion) {
    return (
      <View style={styles.centro}>
        <Text style={styles.avisoTitulo}>Tu cuenta aún no está activada</Text>
        <Text style={styles.avisoTexto}>
          Iniciaste sesión con {usuario?.email}, pero esta cuenta no está vinculada a ningún operador.
        </Text>
        <Text style={styles.avisoTexto}>
          Si eres cliente, abre en este mismo dispositivo el enlace de invitación que te compartió tu operador y
          vuelve a entrar. Si eres operador o administrador, cierra sesión y entra con el correo correcto.
        </Text>
        <Pressable style={styles.avisoBoton} onPress={signOut}>
          <Text style={styles.avisoBotonTexto}>Usar otra cuenta / cerrar sesión</Text>
        </Pressable>
      </View>
    );
  }

  if (loading || resolviendo) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={(destino ?? '/(auth)/login') as never} />;
}

const styles = StyleSheet.create({
  centro: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  avisoTitulo: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  avisoTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  avisoBoton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  avisoBotonTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
});
