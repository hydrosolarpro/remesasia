/**
 * Servicio de envío por Telegram Bot API. Requiere el secret
 * TELEGRAM_BOT_TOKEN (`supabase secrets set TELEGRAM_BOT_TOKEN='...'`).
 * Nunca se debe llamar desde el cliente -- el token solo vive en el
 * entorno de las Edge Functions.
 *
 * Cada función atrapa sus propios errores y devuelve `boolean` en vez de
 * lanzar: un fallo de Telegram (usuario bloqueó al bot, chat_id inválido,
 * etc.) no debe romper el flujo que la llama (p.ej. la validación de un
 * depósito ya se hizo y no debe revertirse por esto).
 */

function botToken(): string {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurado');
  return token;
}

function apiUrl(metodo: string): string {
  return `https://api.telegram.org/bot${botToken()}/${metodo}`;
}

async function llamarApi(metodo: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const respuesta = await fetch(apiUrl(metodo), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!respuesta.ok) {
      console.error(`Telegram ${metodo} falló:`, await respuesta.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Telegram ${metodo} lanzó una excepción:`, err);
    return false;
  }
}

export async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  return llamarApi('sendMessage', { chat_id: chatId, text: message });
}

export async function sendTelegramPhoto(chatId: string, imageUrl: string, caption?: string): Promise<boolean> {
  return llamarApi('sendPhoto', { chat_id: chatId, photo: imageUrl, caption });
}

/**
 * Envía una o varias imágenes (comprobantes de depósito). Con 1 imagen usa
 * sendPhoto normal; con 2+ arma un álbum (sendMediaGroup, tope de Telegram:
 * 10 por álbum) con el caption solo en la primera -- así el destinatario ve
 * todos los comprobantes juntos en vez de mensajes de foto sueltos.
 */
export async function sendTelegramPhotos(chatId: string, imageUrls: string[], caption?: string): Promise<boolean> {
  if (imageUrls.length === 0) return true;

  // Los comprobantes pueden ser PDF: Telegram no los acepta como foto
  // (sendPhoto / sendMediaGroup), así que se mandan aparte como documento.
  const esPdf = (url: string) => url.split('?')[0].toLowerCase().endsWith('.pdf');
  const pdfs = imageUrls.filter(esPdf);
  const fotos = imageUrls.filter((url) => !esPdf(url));

  let ok = true;
  if (fotos.length === 1) {
    ok = await sendTelegramPhoto(chatId, fotos[0], caption);
  } else if (fotos.length > 1) {
    const media = fotos.slice(0, 10).map((url, i) => ({
      type: 'photo',
      media: url,
      ...(i === 0 && caption ? { caption } : {}),
    }));
    ok = await llamarApi('sendMediaGroup', { chat_id: chatId, media });
  }

  // Si no hubo fotos, el mensaje (caption) viaja con el primer PDF.
  for (let i = 0; i < pdfs.length; i++) {
    const enviado = await sendTelegramDocument(chatId, pdfs[i], fotos.length === 0 && i === 0 ? caption : undefined);
    ok = ok && enviado;
  }
  return ok;
}

export async function sendTelegramDocument(chatId: string, fileUrl: string, caption?: string): Promise<boolean> {
  return llamarApi('sendDocument', { chat_id: chatId, document: fileUrl, caption });
}
