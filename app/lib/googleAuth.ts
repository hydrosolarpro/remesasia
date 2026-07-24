import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
// eslint-disable-next-line import/no-internal-modules
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from './supabase';

// Requerido por expo-web-browser en web para cerrar el popup de OAuth.
WebBrowser.maybeCompleteAuthSession();

// En nativo, Supabase redirige de vuelta al esquema de la app
// (`remesasia://`, ver app.json). En web, vuelve al mismo origen: ahí
// supabase-js detecta el token en la URL solo (detectSessionInUrl, ver
// lib/supabase.ts) así que no hace falta procesarlo a mano.
const redirectTo = Platform.OS === 'web' ? undefined : Linking.createURL('/');

async function crearSesionDesdeUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return null;

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
}

/**
 * Inicia sesión con Google. Requiere que el proveedor Google esté
 * configurado en Supabase (Authentication > Providers) — ver README,
 * sección "Habilitar Google Sign-In".
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Supabase no devolvió una URL de autenticación.');

  if (Platform.OS === 'web') {
    // Navegación completa: Google redirige de vuelta al mismo origen con el
    // token en el hash de la URL, que supabase-js recoge automáticamente.
    window.location.assign(data.url);
    return null;
  }

  const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (resultado.type === 'success' && resultado.url) {
    return crearSesionDesdeUrl(resultado.url);
  }
  return null;
}
