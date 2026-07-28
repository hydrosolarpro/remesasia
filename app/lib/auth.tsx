import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { supabase } from './supabase';
import { Usuario } from '../types/database';

interface AuthState {
  session: Session | null;
  usuario: Usuario | null;
  loading: boolean;
  refreshUsuario: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  usuario: null,
  loading: true,
  refreshUsuario: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsuario = async (userId: string | undefined) => {
    if (!userId) {
      setUsuario(null);
      return;
    }
    let { data } = await supabase.from('usuarios').select('*').eq('id', userId).single();

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
    <AuthContext.Provider value={{ session, usuario, loading, refreshUsuario, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
