import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { supabaseCaller } from '../_shared/supabaseCaller.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Elimina un cliente: su fila en `usuarios` y su cuenta de autenticación
 * (para que, si vuelve a entrar, se registre como cliente nuevo desde
 * cero, en vez de quedar en un estado inconsistente). Invocada
 * directamente por el operador Perú desde el panel "Clientes"
 * (app/app/(operador-peru)/clientes.tsx).
 *
 * Solo permite eliminar clientes sin ninguna solicitud registrada -- la
 * FK `solicitudes.cliente_id` ya protege el historial a nivel de base de
 * datos (delete_rule = NO ACTION), pero acá se valida antes para devolver
 * un mensaje claro en vez de un error crudo de Postgres.
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
    if (!rolCaller || !['operador_peru', 'operador_peru_miembro'].includes(rolCaller)) {
      return new Response(JSON.stringify({ error: 'Solo un operador Perú puede eliminar clientes' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: negocioIdCaller } = await caller.rpc('mi_negocio_operador_peru_id');
    if (!negocioIdCaller) {
      return new Response(JSON.stringify({ error: 'No se pudo determinar tu negocio' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const admin = supabaseAdmin();
    const { data: cliente } = await admin
      .from('usuarios')
      .select('rol, negocio_operador_peru_id')
      .eq('id', cliente_id)
      .maybeSingle();

    if (!cliente || cliente.rol !== 'cliente' || cliente.negocio_operador_peru_id !== negocioIdCaller) {
      return new Response(JSON.stringify({ error: 'Cliente no encontrado en tu negocio' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { count } = await admin.from('solicitudes').select('id', { count: 'exact', head: true }).eq('cliente_id', cliente_id);
    if (count && count > 0) {
      return new Response(
        JSON.stringify({ error: 'No se puede eliminar: este cliente ya tiene solicitudes registradas (se conserva el historial).' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { error: deleteError } = await admin.from('usuarios').delete().eq('id', cliente_id);
    if (deleteError) {
      console.error('eliminar-cliente: error borrando usuarios', deleteError);
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
