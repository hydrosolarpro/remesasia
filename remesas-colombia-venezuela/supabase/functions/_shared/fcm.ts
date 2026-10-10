import { GoogleAuth } from 'npm:google-auth-library@9';

/**
 * F8 — Envío de push vía Firebase Cloud Messaging, API HTTP v1 (la legacy server-key
 * API fue retirada por Google). Requiere el secreto FIREBASE_SERVICE_ACCOUNT_JSON
 * (contenido completo del JSON de la cuenta de servicio de Firebase, como un solo string)
 * configurado con `supabase secrets set`.
 */
let cachedAuth: GoogleAuth | null = null;

function getAuth() {
  if (!cachedAuth) {
    const credentials = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!);
    cachedAuth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }
  return cachedAuth;
}

export async function enviarPush(pushToken: string, titulo: string, cuerpo: string, data?: Record<string, string>) {
  const projectId = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!).project_id;
  const client = await getAuth().getClient();
  const { token } = await client.getAccessToken();

  const respuesta = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: pushToken,
        notification: { title: titulo, body: cuerpo },
        data,
      },
    }),
  });

  if (!respuesta.ok) {
    console.error('Error enviando push FCM:', await respuesta.text());
  }
}
