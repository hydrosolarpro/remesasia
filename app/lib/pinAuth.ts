import { supabase } from './supabase';
import { NUMERO_ADMIN_WHATSAPP } from './whatsapp';

// Acceso con teléfono + PIN de 4 dígitos, alternativo a "Continuar con
// Google". La verificación real (hash, rate limit, bloqueo por intentos)
// vive en la base y en la Edge Function `pin-login`; acá solo se llama.

export type TipoAccesoPin = 'operador_venezuela' | 'operador_peru_miembro' | 'cliente';

export interface EstadoPin {
  tiene_pin: boolean;
  pin_temporal?: boolean;
  telefono?: string;
  error?: string;
}

async function mensajeDeError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try {
      const cuerpo = await ctx.json();
      if (cuerpo?.error) return cuerpo.error as string;
    } catch {
      /* respuesta sin JSON */
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Inicia sesión con teléfono + PIN. Devuelve si el PIN era temporal (hay que cambiarlo). */
export async function loginConPin(telefono: string, pin: string): Promise<{ pinTemporal: boolean }> {
  const { data, error } = await supabase.functions.invoke('pin-login', { body: { telefono, pin } });
  if (error) throw new Error(await mensajeDeError(error, 'No se pudo iniciar sesión con PIN.'));
  if (!data?.ok || !data?.token_hash) throw new Error(data?.error ?? 'Teléfono o PIN incorrecto.');

  const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
  if (vErr) throw vErr;
  return { pinTemporal: !!data.pin_temporal };
}

/** El usuario logueado define o cambia su propio PIN. */
export async function definirMiPin(telefono: string, pin: string): Promise<void> {
  const { error } = await supabase.rpc('pin_definir_propio', { p_telefono: telefono, p_pin: pin });
  if (error) throw new Error(error.message);
}

/** Estado del PIN de la propia cuenta (para forzar el cambio de un PIN temporal). */
export async function miEstadoPin(): Promise<EstadoPin> {
  const { data } = await supabase.rpc('mi_pin_estado');
  return (data as EstadoPin) ?? { tiene_pin: false };
}

/** Estado del PIN de un usuario del propio negocio (operador/admin). */
export async function estadoPinUsuario(usuarioId: string): Promise<EstadoPin> {
  const { data } = await supabase.rpc('pin_estado_usuario', { p_usuario_id: usuarioId });
  return (data as EstadoPin) ?? { tiene_pin: false };
}

/** Genera un PIN temporal para un usuario que ya tiene acceso con PIN ("olvidé mi PIN"). */
export async function regenerarPin(usuarioId: string): Promise<{ pin: string; telefono: string }> {
  const { data, error } = await supabase.rpc('pin_regenerar', { p_usuario_id: usuarioId });
  if (error) throw new Error(error.message);
  return data as { pin: string; telefono: string };
}

/** Operador/admin activa el PIN de un usuario de su negocio que ya tiene cuenta pero aún sin PIN. */
export async function activarPinPara(usuarioId: string, telefono: string): Promise<{ pin: string; telefono: string }> {
  const { data, error } = await supabase.rpc('pin_activar_para', { p_usuario_id: usuarioId, p_telefono: telefono });
  if (error) throw new Error(error.message);
  return data as { pin: string; telefono: string };
}

/**
 * Cliente que llega por un enlace de invitación y elige entrar con
 * teléfono + PIN en vez de Google. Crea (o reenvía) su acceso pendiente
 * a partir del token; la cuenta real se materializa en el primer login
 * con `pin-login`. Devuelve el PIN temporal en claro una sola vez para
 * armar el enlace wa.me. `reenvio` indica que ya existía una fila
 * pendiente y solo se regeneró el PIN.
 */
export async function provisionarPinDesdeInvitacion(
  token: string,
  telefono: string,
  nombre: string,
  pin: string
): Promise<{ pin: string; telefono: string; reenvio: boolean }> {
  const { data, error } = await supabase.rpc('pin_provisionar_desde_invitacion', {
    p_token: token,
    p_telefono: telefono,
    p_nombre: nombre,
    p_pin: pin,
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? 'No se pudo crear el acceso con PIN.');
  return data as { pin: string; telefono: string; reenvio: boolean };
}

/** Activa el acceso con PIN para alguien que nunca inició sesión (equipo Perú / VE / cliente). */
export async function provisionarPin(
  tipo: TipoAccesoPin,
  refId: string | null,
  telefono: string,
  nombre: string
): Promise<{ pin: string; telefono: string }> {
  const { data, error } = await supabase.rpc('pin_provisionar', {
    p_tipo: tipo,
    p_ref_id: refId,
    p_telefono: telefono,
    p_nombre: nombre,
  });
  if (error) throw new Error(error.message);
  return data as { pin: string; telefono: string };
}

/**
 * Enlace wa.me para enviarle a un usuario su número + PIN. Por defecto el
 * PIN es temporal (recuperación / alta por el operador) y al entrar la app
 * pide crear el definitivo. Con `temporal: false` el PIN ya es el
 * definitivo que eligió el propio cliente: el mensaje solo se lo recuerda.
 */
export function enlaceWaEnviarPin(
  telefonoE164: string,
  pin: string,
  opciones?: { nombreNegocio?: string; temporal?: boolean }
): string {
  const { nombreNegocio, temporal = true } = opciones ?? {};
  const mensaje = temporal
    ? `Tu acceso a Remesas PERU-VENEZUELA${nombreNegocio ? ` (${nombreNegocio})` : ''}: entra con tu numero de telefono y este PIN: ${pin}. ` +
      `Al ingresar te pedira crear tu PIN definitivo de 4 digitos.`
    : `Tu acceso a Remesas PERU-VENEZUELA${nombreNegocio ? ` (${nombreNegocio})` : ''}: entra con tu numero de telefono +${telefonoE164.replace(/\D/g, '')} y tu PIN: ${pin}. ` +
      `Puedes cambiar tu PIN cuando quieras desde tu Perfil.`;
  return `https://wa.me/${telefonoE164.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace wa.me al soporte cuando alguien olvidó su PIN desde la pantalla de login. */
export function enlaceWaOlvidePin(telefono: string): string {
  const mensaje =
    `Hola, olvide mi PIN de acceso a Remesas PERU-VENEZUELA. ` +
    `Mi numero de telefono es ${telefono.trim() || '(escribe aqui tu numero)'}. Por favor ayudame a recuperarlo.`;
  return `https://wa.me/${NUMERO_ADMIN_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
