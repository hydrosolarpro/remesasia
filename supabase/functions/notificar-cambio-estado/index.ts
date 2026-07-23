import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { enviarPush } from '../_shared/fcm.ts';

/**
 * F8 — Notificaciones push por cambio de estado de una solicitud.
 * Disparada por el trigger `trg_notificar_y_generar_comprobante`
 * (ver supabase/migrations/0005_webhooks.sql).
 */
Deno.serve(async (req) => {
  try {
    const { solicitud_id, estado_nuevo } = await req.json();
    if (!solicitud_id || !estado_nuevo) {
      return new Response(JSON.stringify({ error: 'Falta solicitud_id o estado_nuevo' }), { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data: solicitud } = await supabase.from('solicitudes').select('*').eq('id', solicitud_id).single();
    if (!solicitud) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), { status: 404 });
    }

    const destinatario = await resolverDestinatario(supabase, solicitud, estado_nuevo);
    if (destinatario?.push_token) {
      const { titulo, cuerpo } = mensajePorEstado(estado_nuevo, solicitud);
      await enviarPush(destinatario.push_token, titulo, cuerpo, { solicitud_id, estado: estado_nuevo });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// deno-lint-ignore no-explicit-any
async function resolverDestinatario(supabase: any, solicitud: any, estadoNuevo: string) {
  const idPorEstado: Record<string, string | null> = {
    EN_VERIFICACION: null, // se notifica a todo el equipo de Op. Perú (broadcast simplificado abajo)
    FONDOS_VERIFICADOS: solicitud.cliente_id,
    RECHAZADA: solicitud.cliente_id,
    EN_PROCESO: null, // se notifica a Op. Venezuela (broadcast simplificado abajo)
    COMPLETADA: solicitud.cliente_id,
  };

  const clienteId = idPorEstado[estadoNuevo];
  if (clienteId) {
    const { data } = await supabase.from('usuarios').select('push_token').eq('id', clienteId).single();
    return data;
  }

  // Para EN_VERIFICACION y EN_PROCESO no hay un único destinatario fijo en el MVP
  // (2-3 operadores por rol); se notifica al primero disponible de ese rol.
  const rolDestino = estadoNuevo === 'EN_VERIFICACION' ? 'operador_peru' : 'operador_venezuela';
  const { data } = await supabase
    .from('usuarios')
    .select('push_token')
    .eq('rol', rolDestino)
    .not('push_token', 'is', null)
    .limit(1)
    .maybeSingle();
  return data;
}

// deno-lint-ignore no-explicit-any
function mensajePorEstado(estado: string, solicitud: any): { titulo: string; cuerpo: string } {
  switch (estado) {
    case 'EN_VERIFICACION':
      return { titulo: 'Nueva solicitud con comprobante', cuerpo: `${solicitud.beneficiario_nombre} — S/ ${solicitud.monto_pen}` };
    case 'FONDOS_VERIFICADOS':
      return { titulo: 'Fondos verificados', cuerpo: 'Tu pago fue confirmado, estamos procesando tu remesa.' };
    case 'RECHAZADA':
      return { titulo: 'Comprobante rechazado', cuerpo: solicitud.motivo_rechazo ?? 'Revisa tu solicitud en la app.' };
    case 'EN_PROCESO':
      return { titulo: 'Solicitud lista para transferir', cuerpo: `Transferir Bs ${solicitud.monto_ves} a ${solicitud.beneficiario_nombre}` };
    case 'COMPLETADA':
      return { titulo: 'Remesa completada', cuerpo: 'Tu comprobante ya está disponible para descargar.' };
    default:
      return { titulo: 'Actualización de tu solicitud', cuerpo: `Nuevo estado: ${estado}` };
  }
}
