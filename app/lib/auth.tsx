import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { leerTokenPendiente, limpiarTokenPendiente, canjearInvitacion } from './invitaciones';
import { Usuario } from '../types/database';

interface AuthState {
  session: Session | null;
  usuario: Usuario | null;
  loading: boolean;
  refreshUsuario: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Se llenó si la última carga de sesión encontró una cuenta dada de baja (ver loadUsuario). Login.tsx lo muestra y lo limpia. */
  avisoSesionCerrada: string | null;
  limpiarAvisoSesionCerrada: () => void;
}

const AuthContext = createContext<AuthState>({
  session: null,
  usuario: null,
  loading: true,
  refreshUsuario: async () => {},
  signOut: async () => {},
  avisoSesionCerrada: null,
  limpiarAvisoSesionCerrada: () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [avisoSesionCerrada, setAvisoSesionCerrada] = useState<string | null>(null);

  const loadUsuario = async (userId: string | undefined) => {
    if (!userId) {
      setUsuario(null);
      return;
    }
    let { data } = await supabase.from('usuarios').select('*').eq('id', userId).single();

    // Cuenta dada de baja (el propio cliente desde su Perfil, o eliminada
    // por su operador -- ver supabase/functions/eliminar-cliente). Esa
    // función marca `eliminado_at` y borra la cuenta de auth.users, pero
    // NUNCA debe alcanzar para que alguien vuelva a entrar sin más: si por
    // lo que sea queda (o vuelve a aparecer) una sesión válida para este
    // mismo registro -- el borrado de auth.users falló silenciosamente, o
    // entró de nuevo con Google antes de que el borrado terminara --, esto
    // la bloquea del lado de la app en cuanto se intenta cargar.
    //
    // Única excepción, A PROPÓSITO: si trae guardado el token de un enlace
    // de invitación (ver lib/invitaciones.ts -- se guarda antes de
    // "Continuar con Google" en invitacion/[token].tsx), se intenta
    // canjearlo acá mismo antes de decidir. canjear_invitacion() reactiva
    // la cuenta (limpia eliminado_at) cuando el auth.uid() de la sesión
    // coincide con el dueño de esa invitación -- así un cliente dado de
    // baja SÍ puede volver a entrar abriendo de nuevo el enlace de su
    // operador, que es justamente lo que se espera que pueda hacer.
    if (data?.eliminado_at) {
      const tokenPendiente = await leerTokenPendiente();
      let reactivada = false;
      if (tokenPendiente) {
        try {
          const resultado = await canjearInvitacion(tokenPendiente);
          if (resultado.ok) {
            await limpiarTokenPendiente();
            ({ data } = await supabase.from('usuarios').select('*').eq('id', userId).single());
            reactivada = !data?.eliminado_at;
          }
        } catch (e) {
          console.error('loadUsuario: no se pudo canjear la invitación pendiente de una cuenta dada de baja', e);
        }
      }
      if (!reactivada) {
        await supabase.auth.signOut();
        setSession(null);
        setUsuario(null);
        setAvisoSesionCerrada('Esta cuenta fue dada de baja. Si crees que es un error, contacta a tu operador.');
        router.replace('/(auth)/login');
        return;
      }
    }

    // El vínculo por correo con Operador Venezuela / equipo Operador Perú
    // normalmente ocurre solo una vez, al crear la cuenta (ver
    // handle_new_user en la base de datos). Repetimos esa revisión en cada
    // carga de sesión en dos casos que el trigger no cubre: (a) esta
    // persona ya tenía cuenta como 'cliente' antes de que el Operador Perú
    // cargara su correo, o (b) ya tenía el rol correcto pero su fila de
    // vínculo se borró y se volvió a registrar (queda huérfana si no
    // repetimos la revisión, porque el rol ya no es 'cliente').
    if (data?.rol === 'cliente' || data?.rol === 'operador_venezuela' || data?.rol === 'operador_peru_miembro') {
      const { data: rolActualizado } = await supabase.rpc('vincular_cuenta_pendiente');
      if (rolActualizado && rolActualizado !== data.rol) {
        ({ data } = await supabase.from('usuarios').select('*').eq('id', userId).single());
      }
    }

    setUsuario(data as Usuario | null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadUsuario(data.session?.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadUsuario(newSession?.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const refreshUsuario = async () => loadUsuario(session?.user.id);
  // Al cerrar sesión el usuario debe salir por completo: no basta con
  // borrar la sesión de Supabase, hay que sacarlo de la pantalla protegida
  // en la que estaba (si no, queda viendo un panel roto con `usuario` en
  // null) y llevarlo de vuelta al login, reemplazando el historial para
  // que "atrás" no regrese a una sesión que ya no existe.
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUsuario(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        usuario,
        loading,
        refreshUsuario,
        signOut,
        avisoSesionCerrada,
        limpiarAvisoSesionCerrada: () => setAvisoSesionCerrada(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
