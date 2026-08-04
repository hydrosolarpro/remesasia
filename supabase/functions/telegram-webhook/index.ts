import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendTelegramMessage } from '../_shared/telegram.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Webhook de Telegram: recibe cada update del bot @Remesaspv_bot cuando un
 * usuario presiona "Start" en un enlace `t.me/<bot>?start=<token>`. Cubre
 * dos flujos con el mismo mecanismo (ver 0040_telegram_notificaciones.sql):
 *   - target_type='usuario'      -> el cliente vinculando su propio Telegram.
 *   - target_type='beneficiario' -> el beneficiario (VE, sin cuenta en la
 *     app) vinculando el suyo, vía enlace que el cliente le compartió por WhatsApp.
 *
 * Esta función NO valida un JWT de Supabase (Telegram no puede mandar uno):
 * se despliega con `--no-verify-jwt` y en su lugar valida el secret propio
 * de Telegram (`X-Telegram-Bot-Api-Secret-Token`), configurado al registrar
 * el webhook con `setWebhook?...&secret_token=...`.
 */
Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  const secretEsperado = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  const secretRecibido = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!secretEsperado || secretRecibido !== secretEsperado) {
    return new Response('unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    const update = await req.json();
    const mensaje = update?.message;
    const texto: string | undefined = mensaje?.text;
    const chatId = mensaje?.chat?.id;

    // Solo interesa "/start <token>" -- cualquier otro mensaje se ignora en
    // silencio (200 vacío), tal como espera la API de Telegram.
    if (!texto?.startsWith('/start') || !chatId) {
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const token = texto.replace(/^\/start\s*/, '').trim();
    if (!token) {
      await sendTelegramMessage(String(chatId), 'Usa el enlace de vinculación que te compartieron desde la app Remesas PERU-VENEZUELA.');
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const supabase = supabaseAdmin();
    const { data: tokenRow } = await supabase.from('telegram_link_tokens').select('*').eq('token', token).maybeSingle();

    const invalido = !tokenRow || tokenRow.used_at !== null || new Date(tokenRow.expires_at).getTime() < Date.now();
    if (invalido) {
      await sendTelegramMessage(String(chatId), 'Este enlace de vinculación no es válido o ya expiró. Solicita uno nuevo desde la app.');
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const chatIdTexto = String(chatId);
    const username: string | null = mensaje.from?.username ?? null;

    if (tokenRow.target_type === 'usuario') {
      await supabase
        .from('usuarios')
        .update({ telegram_chat_id: chatIdTexto, telegram_username: username, telegram_connected: true })
        .eq('id', tokenRow.target_id);
    } else {
      // El beneficiario (persona) vive en beneficiarios_cliente desde la
      // Fase C -- puede tener varias cuentas bancarias, pero Telegram se
      // vincula una sola vez por persona, no por cuenta.
      await supabase
        .from('beneficiarios_cliente')
        .update({
          telegram_chat_id: chatIdTexto,
          telegram_username: username,
          telegram_connected: true,
          telegram_connected_at: new Date().toISOString(),
        })
        .eq('id', tokenRow.target_id);
    }

    await supabase.from('telegram_link_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenRow.id);

    await sendTelegramMessage(
      chatIdTexto,
      '✅ Tu Telegram quedó vinculado correctamente. A partir de ahora recibirás aquí las notificaciones de tus remesas.'
    );

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (err) {
    console.error('telegram-webhook: error inesperado', err);
    // 200 igual: Telegram reintenta agresivamente los updates si no recibe 2xx.
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});
