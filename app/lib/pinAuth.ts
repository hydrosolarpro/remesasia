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

/** Enlace wa.me para enviarle a un usuario su PIN (temporal o recién activado). */
export function enlaceWaEnviarPin(telefonoE164: string, pin: string, nombreNegocio?: string): string {
  const mensaje =
    `Tu acceso a Remesas PERU-VENEZUELA${nombreNegocio ? ` (${nombreNegocio})` : ''}: entra con tu numero de telefono y este PIN: ${pin}. ` +
    `Al ingresar te pedira crear tu PIN definitivo de 4 digitos.`;
  return `https://wa.me/${telefonoE164.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
}

/** Enlace wa.me al soporte cuando alguien olvidó su PIN desde la pantalla de login. */
export function enlaceWaOlvidePin(telefono: string): string {
  const mensaje =
    `Hola, olvide mi PIN de acceso a Remesas PERU-VENEZUELA. ` +
    `Mi numero de telefono es ${telefono.trim() || '(escribe aqui tu numero)'}. Por favor ayudame a recuperarlo.`;
  return `https://wa.me/${NUMERO_ADMIN_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
