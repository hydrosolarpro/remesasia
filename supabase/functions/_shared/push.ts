import webpush from 'npm:web-push@3.6.7';
import { enviarPush } from './fcm.ts';

/**
 * Push a una lista de usuarios (operadores): Web Push para sus navegadores/PWA
 * suscritos (push_web_suscripciones) y FCM para su dispositivo nativo
 * (usuarios.push_token). Llega con sonido y aviso flotante aunque la app esté
 * cerrada. Requiere los secrets VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (y
 * opcional VAPID_SUBJECT). Nunca lanza: un fallo de push no debe afectar la
 * operación que lo origina.
 */
export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  /** Ruta que abre al tocar el aviso. */
  url?: string;
  /** Misma etiqueta reemplaza el aviso anterior (p.ej. por solicitud). */
  tag?: string;
}

let vapidListo: boolean | null = null;
function configurarVapid(): boolean {
  if (vapidListo !== null) return vapidListo;
  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) {
    console.log('push: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configurados, se omite Web Push');
    vapidListo = false;
    return false;
  }
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:productosaas2026@gmail.com', pub, priv);
  vapidListo = true;
  return true;
}

// deno-lint-ignore no-explicit-any
export async function enviarPushAUsuarios(supabase: any, usuarioIds: string[], aviso: AvisoPush): Promise<void> {
  try {
    const ids = [...new Set(usuarioIds.filter(Boolean))];
    if (ids.length === 0) return;

    // Web Push
    if (configurarVapid()) {
      const { data: subs } = await supabase
        .from('push_web_suscripciones')
        .select('id, endpoint, p256dh, auth')
        .in('usuario_id', ids);
      const carga = JSON.stringify({ titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: aviso.url ?? '/', tag: aviso.tag });
      await Promise.all(
        // deno-lint-ignore no-explicit-any
        (subs ?? []).map(async (s: any) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, {
              TTL: 60 * 60,
              urgency: 'high',
            });
          } catch (err) {
            // 404/410: la suscripción caducó o el usuario la revocó -> se limpia.
            // deno-lint-ignore no-explicit-any
            const codigo = (err as any)?.statusCode;
            if (codigo === 404 || codigo === 410) {
              await supabase.from('push_web_suscripciones').delete().eq('id', s.id);
            } else {
              console.error('push: fallo Web Push', codigo, err);
            }
          }
        })
      );
    }

    // FCM (apps nativas)
    if (Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')) {
      const { data: usuarios } = await supabase.from('usuarios').select('push_token').in('id', ids).not('push_token', 'is', null);
      await Promise.all(
        // deno-lint-ignore no-explicit-any
        (usuarios ?? []).map((u: any) =>
          enviarPush(u.push_token, aviso.titulo, aviso.cuerpo, { url: aviso.url ?? '/' }).catch((e) => console.error('push: fallo FCM', e))
        )
      );
    }
  } catch (err) {
    console.error('push: error inesperado', err);
  }
}
