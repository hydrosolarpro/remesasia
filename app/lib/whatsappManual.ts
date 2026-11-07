// Envío MANUAL SUPERVISADO por WhatsApp (wa.me).
//
// La app nunca envía nada sola: arma un enlace https://wa.me/... y el propio
// usuario lo abre y pulsa "Enviar" en su WhatsApp. Así no se usa la API
// oficial (sin tarjeta) y se evita el riesgo de bloqueo por automatización.
//
// Módulo aditivo: no modifica lib/whatsapp.ts; reutiliza sus mensajes
// preestablecidos (aviso de remesa, invitación, bienvenida).
import { Linking, Platform } from 'react-native';

/* ------------------------------------------------------------------ */
/* 1. Teléfonos                                                        */
/* ------------------------------------------------------------------ */

/**
 * "+51 999-888-777" -> "51999888777". Quita espacios, guiones, paréntesis,
 * "+" y el prefijo internacional "00". Devuelve null si no parece un número
 * completo (el usuario debe haber escrito el código de país).
 */
export function limpiarTelefonoWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  return digitos.length >= 8 ? digitos : null;
}

/* ------------------------------------------------------------------ */
/* 2. Texto y enlaces                                                  */
/* ------------------------------------------------------------------ */

/** Negrita nativa de WhatsApp. Ignora textos vacíos. */
export function negrita(texto: string | number | null | undefined): string {
  const t = String(texto ?? '').trim();
  return t ? `*${t}*` : '';
}

/**
 * Enlace wa.me. Con teléfono -> chat directo; sin teléfono -> WhatsApp abre
 * su selector de contactos. encodeURIComponent protege espacios, $, !, y
 * saltos de línea (\n -> %0A).
 */
export function construirEnlaceWaManual(telefono: string | null | undefined, mensaje: string): string | null {
  const texto = encodeURIComponent(mensaje);
  if (telefono === undefined || telefono === null) return `https://wa.me/?text=${texto}`;
  const numero = limpiarTelefonoWhatsApp(telefono);
  return numero ? `https://wa.me/${numero}?text=${texto}` : null;
}

/**
 * Acortador OPCIONAL de enlaces internos (landing, imagen). Por privacidad no
 * se envía nada a servicios de terceros por defecto: solo si defines
 * EXPO_PUBLIC_SHORTENER_URL con un endpoint propio que acepte `?url=` y
 * responda el enlace corto en texto plano. Si no está definido o falla,
 * devuelve el enlace ORIGINAL, así nunca se pierde el token del invitado.
 */
export async function acortarEnlace(url: string): Promise<string> {
  const endpoint = (process.env.EXPO_PUBLIC_SHORTENER_URL ?? '').trim();
  if (!endpoint) return url;
  try {
    const resp = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`);
    if (!resp.ok) return url;
    const corto = (await resp.text()).trim();
    return /^https:\/\/\S+$/.test(corto) ? corto : url;
  } catch {
    return url;
  }
}

/**
 * Abre un enlace externo de forma segura. En web: pestaña nueva con
 * noopener + noreferrer. En nativo: Linking.
 */
export function abrirEnlaceExterno(url: string | null | undefined): void {
  if (!url) return;
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  Linking.openURL(url);
}

/** Atributos para <Pressable>/<Text href=...> en web (react-native-web). */
export const ATRIBUTOS_ENLACE_EXTERNO = { target: '_blank', rel: 'noopener noreferrer' } as const;

/* ------------------------------------------------------------------ */
/* 3. Plantillas (texto base = mensajes ya existentes de la app)       */
/* ------------------------------------------------------------------ */

/** Caso 2: invitación a cliente nuevo (tono cercano). Datos clave en negrita. */
export function mensajeWaInvitacionCliente(mensajePreestablecido: string, enlaceInvitacion: string, imagenInstalarUrl: string): string {
  return (
    `${mensajePreestablecido}\n\n` +
    `👉 ${negrita('Regístrate aquí:')} ${enlaceInvitacion}\n\n` +
    `📲 ${negrita('Así instalas la app')} en tu celular, paso a paso: ${imagenInstalarUrl}`
  );
}

/** Caso 3: bienvenida/alerta al equipo de trabajo (tono interno y claro). */
export function mensajeWaBienvenidaEquipo(mensajeBase: string, email: string | null, imagenInstalarUrl: string): string {
  const base = email ? mensajeBase.replace(email, negrita(email)) : mensajeBase;
  return `${base}\n\n📲 ${negrita('Así instalas la app')} en tu celular, paso a paso: ${imagenInstalarUrl}`;
}

/** Caso 1: remesa recibida/validada -> reutiliza el mensaje existente tal cual (mismo texto que Telegram). */
export function construirEnlaceAvisoRemesa(telefonoCliente: string | null | undefined, mensajeExistente: string): string | null {
  if (!telefonoCliente) return null;
  return construirEnlaceWaManual(telefonoCliente, mensajeExistente);
}
