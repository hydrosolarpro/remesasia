import { IMAGEN_INSTALAR_APP_URL } from './materiales';

// Mismo bot que usa TelegramVinculoCard / perfil del cliente.
const BOT_TELEGRAM = 'Remesaspv_bot';

// Widget oficial de Telegram para compartir: abre el selector de chats del
// propio operador (equivalente a wa.me/?text= en WhatsApp), sin necesitar un
// chat_id del destinatario.
function enlaceCompartirTelegram(url: string, texto: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texto)}`;
}

// Deep link al bot con la invitación del operador: `inv_<token>`. Al pulsar
// Start, el webhook (supabase/functions/telegram-webhook) responde con la
// guía de instalación (imagen) y el enlace de registro de ese negocio.
export function construirEnlaceBotInvitacionCliente(token: string): string {
  return `https://t.me/${BOT_TELEGRAM}?start=inv_${token}`;
}

/**
 * Invitación de CLIENTE por Telegram. Llega igual que la de WhatsApp: mensaje
 * de presentación + enlace de registro + guía de instalación. La guía va como
 * `url` compartido, así Telegram muestra la IMAGEN directamente como vista
 * previa. Además lleva el enlace al bot: al pulsar Start el cliente queda
 * vinculado y el bot le reenvía la imagen y el enlace de registro, y a partir
 * de ahí recibe sus notificaciones por Telegram.
 */
export function construirEnlaceTelegramInvitacionCliente(token: string, mensajePresentacion: string, enlaceRegistro: string): string {
  const texto =
    `${mensajePresentacion}

` +
    `👉 Regístrate aquí: ${enlaceRegistro}

` +
    `🤖 Recibe tus notificaciones por Telegram: pulsa este enlace y presiona "Start" (Iniciar): ${construirEnlaceBotInvitacionCliente(token)}

` +
    `📲 Así instalas la app en tu celular, paso a paso:`;
  return enlaceCompartirTelegram(IMAGEN_INSTALAR_APP_URL, texto);
}

/** Bienvenida de OPERADOR (miembro o Venezuela) por Telegram: misma información que la de WhatsApp. */
export function construirEnlaceTelegramBienvenidaOperador(mensajeBienvenida: string): string {
  return enlaceCompartirTelegram(
    IMAGEN_INSTALAR_APP_URL,
    `${mensajeBienvenida}\n\n📲 Así instalas la app en tu celular, paso a paso:`
  );
}
