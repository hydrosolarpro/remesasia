import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { TipoInvitacion } from '../types/database';

const CLAVE_TOKEN_PENDIENTE = 'remesasia_invitacion_pendiente';

// Base pública para armar el enlace copiable. En producción, define
// EXPO_PUBLIC_WEB_BASE_URL con el dominio real (Vercel) para que el enlace
// sea https:// y abra bien desde WhatsApp — los esquemas propios
// (remesasia://) no se vuelven clickeables ahí. Mientras no haya dominio,
// cae a localhost (sirve para probar pegando el link en el navegador).
const BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? Constants.expoConfig?.extra?.webBaseUrl ?? 'http://localhost:8081';

export async function crearInvitacion(tipo: TipoInvitacion, negocioOperadorPeruId?: string) {
  const { data: usuario } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({
      tipo,
      negocio_operador_peru_id: tipo === 'cliente' ? negocioOperadorPeruId : null,
      creado_por: usuario.user!.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function construirEnlaceInvitacion(token: string) {
  return `${BASE_URL}/invitacion/${token}`;
}

export async function guardarTokenPendiente(token: string) {
  await AsyncStorage.setItem(CLAVE_TOKEN_PENDIENTE, token);
}

export async function leerYLimpiarTokenPendiente(): Promise<string | null> {
  const token = await AsyncStorage.getItem(CLAVE_TOKEN_PENDIENTE);
  if (token) await AsyncStorage.removeItem(CLAVE_TOKEN_PENDIENTE);
  return token;
}

export async function canjearInvitacion(token: string) {
  const { data, error } = await supabase.rpc('canjear_invitacion', { p_token: token });
  if (error) throw error;
  return data as { ok: boolean; tipo?: TipoInvitacion; error?: string };
}
