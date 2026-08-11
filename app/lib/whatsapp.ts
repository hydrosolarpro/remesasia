// wa.me exige el número completo con código de país, sin espacios/guiones
// y SIN el 0 inicial que se usa en Venezuela para marcar en local
// (0412-1234567 al marcar, pero 584121234567 para wa.me). Si el usuario ya
// escribió el +58 lo respetamos tal cual.
export function normalizarTelefonoVe(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/\D/g, '');
  if (!soloDigitos) return null;

  // Ya viene con código de país (58 + 10 dígitos = 12).
  if (soloDigitos.startsWith('58') && soloDigitos.length === 12) return soloDigitos;

  // Formato local venezolano: 0412xxxxxxx (11 dígitos, empieza en 0).
  if (soloDigitos.startsWith('0') && soloDigitos.length === 11) return `58${soloDigitos.slice(1)}`;

  // Sin el 0 inicial y sin código de país (10 dígitos, ej. 4121234567).
  if (soloDigitos.length === 10) return `58${soloDigitos}`;

  // Cualquier otro caso razonable: lo dejamos tal cual si tiene pinta de
  // número completo, para no bloquear números de otros países.
  return soloDigitos.length >= 10 ? soloDigitos : null;
}

export function construirEnlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const normalizado = normalizarTelefonoVe(telefono);
  if (!normalizado) return null;
  return `https://wa.me/${normalizado}?text=${encodeURIComponent(mensaje)}`;
}

// Para números que NO son de Venezuela (p.ej. operadores en Perú, +51):
// a diferencia de normalizarTelefonoVe, acá no hay una regla fija de
// código de país que asumir, así que se exige que el operador lo haya
// escrito él mismo (los placeholders del formulario ya lo piden, p.ej.
// "+51 999 999 999") y solo se limpian los caracteres que no son dígitos.
export function normalizarTelefonoGenerico(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/\D/g, '');
  return soloDigitos.length >= 8 ? soloDigitos : null;
}

export function construirEnlaceWhatsAppGenerico(telefono: string | null | undefined, mensaje: string): string | null {
  const normalizado = normalizarTelefonoGenerico(telefono);
  if (!normalizado) return null;
  return `https://wa.me/${normalizado}?text=${encodeURIComponent(mensaje)}`;
}

// Enlace de WhatsApp SIN destinatario fijo: al abrirlo, WhatsApp muestra el
// selector de contactos del propio operador para que elija a quién
// reenviar el mensaje -- para invitaciones masivas donde no hay (ni hace
// falta) un teléfono de destino conocido de antemano.
export function construirEnlaceWhatsAppSinDestino(mensaje: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

// Mensaje de confirmación enviado automáticamente al validar un depósito
// (tanto el de Perú -> cliente, como el de Venezuela -> beneficiario): el
// mismo texto para ambos casos, a pedido explícito del negocio.
export function mensajeConfirmacionDeposito(nombreNegocio: string, entidadBancaria: string, montoVesFormateado: string): string {
  return `Gracias por su confianza en Remesas PERU-VENEZUELA - ${nombreNegocio}, se ha transferido a su cuenta ${entidadBancaria} la cantidad de VES ${montoVesFormateado}, por favor revisar y verificar el depósito en cuenta. Muchas Gracias !!!!.`;
}

// Aviso al CLIENTE (Perú) apenas el operador valida que su pago llegó en
// Perú -- mismo texto que el aviso automático de Telegram (notificarCliente
// en supabase/functions/telegram-notificar-deposito), para que el cliente
// reciba el mismo mensaje sin importar el canal.
export function mensajeAvisoClientePeruValidado(nombreCliente: string, nombreNegocio: string, montoPenFormateado: string): string {
  return `✅ Gracias ${nombreCliente} por tu confianza en ${nombreNegocio}. Tu depósito de S/ ${montoPenFormateado} fue validado. En breve se realizará la transferencia a la cuenta en Venezuela que ha solicitado. Revisa tus "Solicitudes" en el aplicativo Remesas PERU-VENEZUELA.`;
}

// Aviso al CLIENTE (Perú) apenas el operador de Venezuela carga el
// comprobante de la transferencia a su beneficiario -- mismo texto que el
// aviso automático de Telegram (notificarClienteDepositoVe).
export function mensajeAvisoClienteVeValidado(nombreCliente: string, nombreBeneficiario: string, montoVesFormateado: string): string {
  return `✅ Hola ${nombreCliente}, te informamos que se transfirió VES ${montoVesFormateado} a la cuenta de ${nombreBeneficiario} en Venezuela. Por favor confirma con tu beneficiario que recibió el depósito. ¡Gracias por tu confianza!`;
}
