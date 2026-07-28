import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';
import { formatearBs } from '../_shared/formato.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Notificaciones automáticas por Telegram al validar un depósito.
 * Disparada por el trigger `trg_telegram_notificar_deposito`
 * (ver supabase/migrations/0040_telegram_notificaciones.sql), uno por cada
 * check que se marca en `solicitudes`: `check_deposito_peru` (avisa al
 * cliente) y `check_deposito_ve` (avisa al beneficiario en Venezuela).
 *
 * Si el destinatario no tiene Telegram conectado, o Telegram devuelve un
 * error, no se lanza excepción: solo se registra en los logs. El depósito
 * ya quedó validado antes de que este trigger se dispare, así que un fallo
 * aquí nunca debe revertir ni bloquear esa validación.
 */
Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  try {
    const { solicitud_id, tipo } = await req.json();
    if (!solicitud_id || (tipo !== 'peru' && tipo !== 'venezuela')) {
      return new Response(JSON.stringify({ error: 'Falta solicitud_id o tipo inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = supabaseAdmin();
    const { data: solicitud } = await supabase.from('solicitudes').select('*').eq('id', solicitud_id).single();
    if (!solicitud) {
      console.error(`telegram-notificar-deposito: solicitud ${solicitud_id} no encontrada`);
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (tipo === 'peru') {
      await notificarCliente(supabase, solicitud);
    } else {
      await notificarBeneficiario(supabase, solicitud);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (err) {
    console.error('telegram-notificar-deposito: error inesperado', err);
    // Se responde 200 igualmente: esta función es fire-and-forget desde
    // pg_net y no debe generar reintentos ni afectar la solicitud ya validada.
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});

// deno-lint-ignore no-explicit-any
async function nombreNegocioDe(supabase: any, negocioOperadorPeruId: string): Promise<string> {
  const { data } = await supabase
    .from('perfil_negocio')
    .select('nombre_negocio')
    .eq('operador_peru_id', negocioOperadorPeruId)
    .maybeSingle();
  return data?.nombre_negocio || 'Remesas PERU-VENEZUELA';
}

// deno-lint-ignore no-explicit-any
async function notificarCliente(supabase: any, solicitud: any) {
  const { data: cliente } = await supabase
    .from('usuarios')
    .select('nombre, telegram_chat_id, telegram_connected')
    .eq('id', solicitud.cliente_id)
    .single();

  if (!cliente?.telegram_connected || !cliente.telegram_chat_id) {
    console.log(`telegram-notificar-deposito: cliente ${solicitud.cliente_id} sin Telegram conectado, se omite envío`);
    return;
  }

  const nombreNegocio = await nombreNegocioDe(supabase, solicitud.negocio_operador_peru_id);
  const mensaje =
    `✅ Gracias ${cliente.nombre} por tu confianza en ${nombreNegocio}. ` +
    `Tu depósito de S/ ${solicitud.monto_pen.toFixed(2)} fue validado. ` +
    `En breve se realizará la transferencia a la cuenta en Venezuela que ha solicitado. ` +
    `Revisa tus "Solicitudes" en el aplicativo Remesas PERU-VENEZUELA.`;

  const enviado = await sendTelegramMessage(cliente.telegram_chat_id, mensaje);
  if (!enviado) console.error(`telegram-notificar-deposito: falló el envío al cliente ${solicitud.cliente_id}`);
}

// deno-lint-ignore no-explicit-any
async function notificarBeneficiario(supabase: any, solicitud: any) {
  const { data: beneficiario } = await supabase
    .from('cuentas_utilizadas_cliente')
    .select('telegram_chat_id, telegram_connected')
    .eq('cliente_id', solicitud.cliente_id)
    .eq('ci', solicitud.beneficiario_ci)
    .eq('numero_cuenta', solicitud.beneficiario_cuenta)
    .maybeSingle();

  if (!beneficiario?.telegram_connected || !beneficiario.telegram_chat_id) {
    console.log(`telegram-notificar-deposito: beneficiario de solicitud ${solicitud.id} sin Telegram conectado, se omite envío`);
    return;
  }

  const { data: cliente } = await supabase.from('usuarios').select('nombre').eq('id', solicitud.cliente_id).single();
  const nombreNegocio = await nombreNegocioDe(supabase, solicitud.negocio_operador_peru_id);
  const nombreCliente = cliente?.nombre ?? 'tu cliente';

  const mensaje =
    `✅ Gracias ${solicitud.beneficiario_nombre} por tu confianza en ${nombreNegocio} de Remesas PERÚ-VENEZUELA. ` +
    `Le comunicamos que se ha transferido a su cuenta ${solicitud.beneficiario_cuenta} de la ${solicitud.beneficiario_banco} ` +
    `por una cantidad de Bs ${formatearBs(solicitud.monto_ves)}, solicitado por ${nombreCliente}. ` +
    `Por favor verificar dicho deposito en cuenta. En caso contrario comunicarse con ${nombreCliente}.`;

  const enviado = await sendTelegramMessage(beneficiario.telegram_chat_id, mensaje);
  if (!enviado) console.error(`telegram-notificar-deposito: falló el envío al beneficiario de solicitud ${solicitud.id}`);
}
