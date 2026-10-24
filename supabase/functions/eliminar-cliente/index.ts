import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { supabaseCaller } from '../_shared/supabaseCaller.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * "Elimina" un cliente: borrado lógico (marca `eliminado_at` y borra el
 * `email`) + borra su cuenta de autenticación, para que desaparezca de
 * "Clientes registrados" y libere su cupo, sin importar cuántas
 * solicitudes tenga. La fila de `usuarios` se conserva a propósito -- así
 * sus solicitudes pasadas siguen mostrando su nombre y datos completos en
 * reportes/exportes (Excel/PDF), en vez de quedar huérfanas; el correo sí
 * se borra por pedido explícito del negocio. Si vuelve a entrar con la
 * misma cuenta de Google, se registra como cliente nuevo desde cero
 * (auth.users le asigna un id distinto, no hay conflicto).
 *
 * Dos formas de invocarla:
 * 1) El operador Perú elimina a uno de sus clientes, desde el panel
 *    "Clientes" (app/app/(operador-peru)/clientes.tsx).
 * 2) El propio cliente se da de baja desde su Perfil
 *    (app/app/(cliente)/perfil.tsx) -- mismo `cliente_id` que su propio
 *    id de sesión, sin necesitar pertenecer a ningún negocio como caller.
 */
Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  try {
    const { cliente_id } = await req.json();
    if (!cliente_id) {
      return new Response(JSON.stringify({ error: 'Falta cliente_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const caller = supabaseCaller(req);
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: rolCaller } = await caller.rpc('rol_actual');
    const esBajaPropia = rolCaller === 'cliente' && cliente_id === user.id;

    if (!esBajaPropia && (!rolCaller || !['operador_peru', 'operador_peru_miembro'].includes(rolCaller))) {
      return new Response(JSON.stringify({ error: 'Solo un operador Perú puede eliminar clientes' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const admin = supabaseAdmin();
    const { data: cliente } = await admin
      .from('usuarios')
      .select('rol, negocio_operador_peru_id, eliminado_at')
      .eq('id', cliente_id)
      .maybeSingle();

    if (!esBajaPropia) {
      const { data: negocioIdCaller } = await caller.rpc('mi_negocio_operador_peru_id');
      if (!negocioIdCaller) {
        return new Response(JSON.stringify({ error: 'No se pudo determinar tu negocio' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      if (!cliente || cliente.rol !== 'cliente' || cliente.negocio_operador_peru_id !== negocioIdCaller) {
        return new Response(JSON.stringify({ error: 'Cliente no encontrado en tu negocio' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    if (!cliente || cliente.rol !== 'cliente') {
      return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (cliente.eliminado_at) {
      return new Response(JSON.stringify({ error: 'Este cliente ya fue eliminado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { error: deleteError } = await admin
      .from('usuarios')
      .update({ eliminado_at: new Date().toISOString(), email: null })
      .eq('id', cliente_id);
    if (deleteError) {
      console.error('eliminar-cliente: error marcando eliminado_at', deleteError);
      return new Response(JSON.stringify({ error: 'No se pudo eliminar el registro del cliente' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { error: authError } = await admin.auth.admin.deleteUser(cliente_id);
    if (authError) {
      // El registro de la app ya se borró; solo se deja constancia en
      // logs -- no revertimos la eliminación por esto.
      console.error('eliminar-cliente: error borrando cuenta de auth', authError);
    }

    // Derecho de cancelación (Ley 29733): además del borrado lógico, se
    // eliminan los datos personales que no hay obligación legal de conservar.
    // Cada paso registra su error pero no revierte la baja. Se CONSERVAN, a
    // propósito, los registros de operaciones (solicitudes y su nombre /
    // teléfono histórico) y el documento de identidad, porque pueden ser
    // exigibles por ley (tributaria y de prevención de lavado de activos);
    // el plazo exacto debe confirmarlo el asesor legal. Para purgar también
    // el documento, define el secret PURGAR_DOCUMENTO_IDENTIDAD=true.
    const limpiezas: Array<[string, PromiseLike<{ error: unknown }>]> = [
      [
        'datos de contacto',
        admin
          .from('usuarios')
          .update({
            push_token: null,
            telegram_chat_id: null,
            telegram_username: null,
            telegram_connected: false,
            referido_nombre: null,
            referido_apellido: null,
            referido_telefono: null,
          })
          .eq('id', cliente_id),
      ],
      ['beneficiarios guardados', admin.from('beneficiarios_cliente').delete().eq('cliente_id', cliente_id)],
      ['cuentas utilizadas', admin.from('cuentas_utilizadas_cliente').delete().eq('cliente_id', cliente_id)],
      ['tasas especiales', admin.from('tasas_cliente').delete().eq('cliente_id', cliente_id)],
      ['PIN de acceso', admin.from('acceso_pin').delete().eq('usuario_id', cliente_id)],
    ];
    for (const [etiqueta, operacion] of limpiezas) {
      const { error: limpiezaError } = await operacion;
      if (limpiezaError) console.error(`eliminar-cliente: error limpiando ${etiqueta}`, limpiezaError);
    }

    if (Deno.env.get('PURGAR_DOCUMENTO_IDENTIDAD') === 'true') {
      await admin
        .from('usuarios')
        .update({ documento_tipo: null, documento_numero: null, documento_imagen_url: null })
        .eq('id', cliente_id);
      const { data: archivos } = await admin.storage.from('documentos-identidad').list(cliente_id);
      if (archivos && archivos.length > 0) {
        const { error: borradoError } = await admin.storage
          .from('documentos-identidad')
          .remove(archivos.map((a) => `${cliente_id}/${a.name}`));
        if (borradoError) console.error('eliminar-cliente: error borrando documento de identidad', borradoError);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (err) {
    console.error('eliminar-cliente: error inesperado', err);
    return new Response(JSON.stringify({ error: 'Error inesperado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
