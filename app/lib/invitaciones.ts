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
//
// El `.trim()` no es cosmético: una variable de entorno de Vercel guardada
// con un salto de línea al final (fácil de arrastrar al copiar/pegar el
// valor) rompe el enlace en dos líneas dentro del mensaje de WhatsApp --
// WhatsApp solo autoenlaza la primera línea, así que todo lo que va
// después (p.ej. "?op=<token>") se pierde como texto suelto y nunca llega
// como parte del link. Pasó justo con EXPO_PUBLIC_LANDING_BASE_URL: un
// cliente invitado por un miembro terminaba registrado bajo el token por
// defecto (el del operador principal) porque el "?op=" nunca se enviaba.
export const BASE_URL = (process.env.EXPO_PUBLIC_WEB_BASE_URL ?? Constants.expoConfig?.extra?.webBaseUrl ?? 'http://localhost:8081').trim();

// Landing de captación de clientes (remesas-per-venezuela-env-oya,
// desplegada aparte en Vercel). Es la MISMA página para todos los
// operadores: cada uno la comparte con su propio token como parámetro
// (?op=), y ella arma sola el enlace de invitación real de ese negocio en
// sus botones "Accede YA" (ver src/data/appData.ts de esa landing).
const LANDING_BASE_URL = (
  process.env.EXPO_PUBLIC_LANDING_BASE_URL ?? 'https://remesas-per-venezuela-env-oya.ai.studio'
).trim();

// Landing de captación de OPERADORES (remesas-perú-venezuela/, proyecto
// "remesas-peru-venezuela-saas" en Vercel) -- distinta de LANDING_BASE_URL
// de arriba, que es la de captación de CLIENTES ("envíoya"). El admin
// comparte este enlace fijo (sin token) desde (admin)/index.tsx: quien lo
// abre completa ahí el cuestionario de calificación y ahí mismo
// registrar_prospecto() le arma su invitación y acceso -- ver
// ModalCalificacion.tsx de esa landing.
const OPERADOR_LANDING_BASE_URL = (
  process.env.EXPO_PUBLIC_OPERADOR_LANDING_BASE_URL ?? 'https://remesas-peru-venezuela-saas.vercel.app'
).trim();

export function construirEnlaceLandingOperador() {
  return OPERADOR_LANDING_BASE_URL;
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

// Separado de "limpiar" a propósito: si se borra el token ANTES de saber
// si canjearInvitacion() tuvo éxito, un canje fallido (cupo de clientes
// alcanzado, invitación ya usada, error de red) deja al usuario sin
// negocio vinculado y sin ninguna forma de reintentar -- el cliente queda
// registrado pero invisible para cualquier operador. Ver app/index.tsx:
// solo se llama a limpiarTokenPendiente() después de un canje exitoso.
export async function leerTokenPendiente(): Promise<string | null> {
  return AsyncStorage.getItem(CLAVE_TOKEN_PENDIENTE);
}

export async function limpiarTokenPendiente(): Promise<void> {
  await AsyncStorage.removeItem(CLAVE_TOKEN_PENDIENTE);
}

export async function canjearInvitacion(token: string) {
  const { data, error } = await supabase.rpc('canjear_invitacion', { p_token: token });
  if (error) throw error;
  return data as { ok: boolean; tipo?: TipoInvitacion; error?: string; codigo?: string };
}
