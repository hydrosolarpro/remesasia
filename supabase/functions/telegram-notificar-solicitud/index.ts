import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';
import { monedaDeSolicitud } from '../_shared/moneda.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Aviso por Telegram a los operadores cuando llega una solicitud nueva.
 * Disparada por `trg_telegram_notificar_solicitud` (migración 0130).
 * Destinatarios: el Operador principal del negocio y, si la solicitud está
 * asignada a un miembro del equipo, ese miembro. Quien no tenga Telegram
 * vinculado se omite; ningún fallo aquí afecta a la solicitud.
 */
Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  try {
    const { solicitud_id } = await req.json();
    if (!solicitud_id) {
      return new Response(JSON.stringify({ error: 'Falta solicitud_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabase = supabaseAdmin();
    const { data: solicitud } = await supabase.from('solicitudes').select('*').eq('id', solicitud_id).single();
    if (!solicitud || !['PENDIENTE', 'EN_VERIFICACION'].includes(solicitud.estado)) return ok();

    const { data: clienteRow } = await supabase
      .from('usuarios')
      .select('nombre, invitado_por_operador_miembro_id')
      .eq('id', solicitud.cliente_id)
      .maybeSingle();
    const cliente = clienteRow;
    const moneda = await monedaDeSolicitud(supabase, solicitud);

    const fecha = new Date(solicitud.created_at ?? Date.now()).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const mensaje =
      `🔔 Nueva solicitud\n` +
      `👤 Cliente: ${cliente?.nombre ?? 'Sin nombre'}\n` +
      `💰 Monto: ${moneda.etiqueta} ${Number(solicitud.monto_pen).toFixed(2)}\n` +
      `🕒 ${fecha}`;

    // IDs de usuario a avisar: principal + miembro asignado (si existe).
    const usuarioIds = new Set<string>();
    if (solicitud.negocio_operador_peru_id) usuarioIds.add(solicitud.negocio_operador_peru_id);
    // Los miembros manejan sus propios clientes: el miembro es el que atiende
    // la solicitud (operador_peru_miembro_id) o el que invitó al cliente.
    const miembroIds = new Set<string>();
    if (solicitud.operador_peru_miembro_id) miembroIds.add(solicitud.operador_peru_miembro_id);
    if (clienteRow?.invitado_por_operador_miembro_id) miembroIds.add(clienteRow.invitado_por_operador_miembro_id);
    if (miembroIds.size > 0) {
      const { data: miembros } = await supabase
        .from('operador_peru_miembro')
        .select('usuario_id')
        .in('id', [...miembroIds])
        .eq('operador_peru_id', solicitud.negocio_operador_peru_id);
      for (const m of miembros ?? []) if (m.usuario_id) usuarioIds.add(m.usuario_id);
    }
    if (usuarioIds.size === 0) return ok();

    const { data: operadores } = await supabase
      .from('usuarios')
      .select('id, telegram_chat_id, telegram_connected')
      .in('id', [...usuarioIds]);

    for (const op of operadores ?? []) {
      if (!op.telegram_connected || !op.telegram_chat_id) {
        console.log(`telegram-notificar-solicitud: operador ${op.id} sin Telegram vinculado, se omite`);
        continue;
      }
      const enviado = await sendTelegramMessage(op.telegram_chat_id, mensaje);
      if (!enviado) console.error(`telegram-notificar-solicitud: falló el envío al operador ${op.id}`);
    }
    return ok();
  } catch (err) {
    console.error('telegram-notificar-solicitud: error inesperado', err);
    return ok();
  }
});
