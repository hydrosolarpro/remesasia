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
 * Invitación de CLIENTE por Telegram. Lleva el mensaje de presentación y las
 * instrucciones para vincularse con el bot: ahí recibirá la imagen de
 * instalación y el enlace para abrir la invitación y registrarse.
 */
export function construirEnlaceTelegramInvitacionCliente(token: string, mensajePresentacion: string): string {
  const texto =
    `${mensajePresentacion}\n\n` +
    `📲 Para recibir la información, vincúlate con nuestro bot de Telegram:\n` +
    `1) Pulsa el enlace de abajo.\n` +
    `2) Presiona "Start" (Iniciar).\n` +
    `3) El bot te enviará la guía para instalar la app en tu celular y el enlace de invitación para registrarte como cliente.`;
  return enlaceCompartirTelegram(construirEnlaceBotInvitacionCliente(token), texto);
}

/** Bienvenida de OPERADOR (miembro o Venezuela) por Telegram: misma información que la de WhatsApp. */
export function construirEnlaceTelegramBienvenidaOperador(mensajeBienvenida: string): string {
  return enlaceCompartirTelegram(
    IMAGEN_INSTALAR_APP_URL,
    `${mensajeBienvenida}\n\n📲 Así instalas la app en tu celular, paso a paso:`
  );
}
