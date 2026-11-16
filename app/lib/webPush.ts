import { Platform } from 'react-native';
import { supabase } from './supabase';

// Clave PÚBLICA VAPID (la privada vive solo en los secrets de Supabase).
const VAPID_PUBLIC_KEY = (process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '').trim();

export type EstadoWebPush = 'no_soportado' | 'sin_clave' | 'denegado' | 'inactivo' | 'activo';

function soportado(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function claveAUint8(base64: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const crudo = atob(b64);
  return Uint8Array.from([...crudo].map((c) => c.charCodeAt(0)));
}

async function registrarSW(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

export async function estadoWebPush(): Promise<EstadoWebPush> {
  if (!soportado()) return 'no_soportado';
  if (!VAPID_PUBLIC_KEY) return 'sin_clave';
  if (Notification.permission === 'denied') return 'denegado';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'activo' : 'inactivo';
  } catch {
    return 'inactivo';
  }
}

async function guardarSuscripcion(sub: PushSubscription): Promise<boolean> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  const { error } = await supabase.rpc('registrar_push_web', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });
  return !error;
}

/** Pide permiso (debe llamarse desde un toque del usuario), suscribe y guarda en el servidor. */
export async function activarWebPush(): Promise<{ ok: boolean; motivo?: string }> {
  if (!soportado()) return { ok: false, motivo: 'Este navegador no admite notificaciones push. En iPhone, instala la app en la pantalla de inicio.' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, motivo: 'Faltan configurar las claves de notificaciones (VAPID).' };
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return { ok: false, motivo: 'Permiso de notificaciones denegado. Actívalo en los ajustes del navegador.' };
    const reg = await registrarSW();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAUint8(VAPID_PUBLIC_KEY) as BufferSource }));
    const guardada = await guardarSuscripcion(sub);
    return guardada ? { ok: true } : { ok: false, motivo: 'No se pudo guardar la suscripción. Intenta de nuevo.' };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'No se pudo activar.' };
  }
}

/** Si el permiso ya estaba concedido, re-guarda la suscripción en silencio (cambio de cuenta, token renovado). */
export async function reactivarWebPushSiPermitido(): Promise<void> {
  if (!soportado() || !VAPID_PUBLIC_KEY || Notification.permission !== 'granted') return;
  try {
    const reg = await registrarSW();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAUint8(VAPID_PUBLIC_KEY) as BufferSource }));
    await guardarSuscripcion(sub);
  } catch {
    // Silencioso: el aviso manual (AvisosPushCard) queda como respaldo.
  }
}
