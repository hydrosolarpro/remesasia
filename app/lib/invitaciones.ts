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

// Landing de captación de clientes (remesas-per-venezuela-env-oya,
// desplegada aparte en Vercel). Es la MISMA página para todos los
// operadores: cada uno la comparte con su propio token como parámetro
// (?op=), y ella arma sola el enlace de invitación real de ese negocio en
// sus botones "Accede YA" (ver src/data/appData.ts de esa landing).
const LANDING_BASE_URL =
  process.env.EXPO_PUBLIC_LANDING_BASE_URL ?? 'https://remesas-per-venezuela-env-oya.ai.studio';

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

// El enlace de clientes es único y reutilizable por operador: si ya existe
// uno (nunca se marca `usado_por` para tipo 'cliente', ver canjear_invitacion),
// se reutiliza en vez de generar uno nuevo cada vez que se abre la pantalla.
// Si el que invita es un miembro de Perú (operador_peru_miembro), su
// invitación queda ligada a su `operador_peru_miembro.id` para que el
// cliente se asigne automáticamente a ese operador de Perú.
export async function obtenerOCrearInvitacionCliente(negocioOperadorPeruId: string, miembroId?: string | null) {
  const { data: usuario } = await supabase.auth.getUser();
  const { data: existente } = await supabase
    .from('invitaciones')
    .select('*')
    .eq('tipo', 'cliente')
    .eq('creado_por', usuario.user!.id)
    .maybeSingle();
  if (existente) return existente;
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({
      tipo: 'cliente',
      negocio_operador_peru_id: negocioOperadorPeruId,
      creado_por: usuario.user!.id,
      operador_peru_miembro_id: miembroId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function construirEnlaceInvitacion(token: string) {
  return `${BASE_URL}/invitacion/${token}`;
}

// Enlace que comparte el operador con sus clientes: pasa primero por la
// landing de captación (con su propio token identificándolo) y de ahí el
// botón "Accede YA" lleva a construirEnlaceInvitacion(token) de ese mismo
// negocio -- sin este paso intermedio, el cliente iría directo a
// /invitacion/<token> sin ver la página de presentación.
export function construirEnlaceLandingCliente(token: string) {
  return `${LANDING_BASE_URL}/?op=${encodeURIComponent(token)}`;
}

// El Operador Venezuela no canjea un token: su cuenta se vincula sola por
// email (ver trigger `handle_new_user`) apenas inicia sesión con Google
// por primera vez. Este enlace es solo la puerta de entrada a la app.
export function construirEnlaceEntrada() {
  return BASE_URL;
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
