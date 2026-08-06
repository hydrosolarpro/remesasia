import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { supabaseCaller } from '../_shared/supabaseCaller.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * "Elimina" un cliente: borrado lógico (marca `eliminado_at`) + borra su
 * cuenta de autenticación, para que desaparezca de "Clientes registrados"
 * y libere su cupo, sin importar cuántas solicitudes tenga. La fila de
 * `usuarios` se conserva a propósito -- así sus solicitudes pasadas
 * siguen mostrando su nombre y datos completos en reportes/exportes
 * (Excel/PDF), en vez de quedar huérfanas. Si vuelve a entrar con la
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

    const { error: deleteError } = await admin.from('usuarios').update({ eliminado_at: new Date().toISOString() }).eq('id', cliente_id);
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

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (err) {
    console.error('eliminar-cliente: error inesperado', err);
    return new Response(JSON.stringify({ error: 'Error inesperado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
