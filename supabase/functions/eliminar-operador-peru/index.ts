import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { supabaseCaller } from '../_shared/supabaseCaller.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Borrado FÍSICO de un Operador principal de Perú y todo su negocio (su
 * equipo de Perú, sus operadores de Venezuela y sus clientes) -- acción
 * exclusiva del Administrador, irreversible.
 *
 * El trabajo pesado (desvincular/borrar filas, en el orden correcto para
 * no chocar con las foreign keys) vive en el RPC `eliminar_operador_peru`
 * (ver supabase/migrations/0078_eliminar_operador_peru.sql), que corre
 * dentro de una sola transacción de Postgres y devuelve los ids de auth
 * que hay que borrar. Esta función solo valida que quien llama es
 * administrador y, ya con la base de datos limpia, borra esas cuentas de
 * Supabase Auth con el service_role (auth.admin.deleteUser no se puede
 * hacer desde un RPC de Postgres).
 *
 * A propósito, `solicitudes` y `pagos_suscripcion` de este negocio NO se
 * borran -- quedan como historial contable, desvinculadas de cualquier
 * cuenta (ver la migración 0078 para el detalle).
 */
Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  try {
    const { operador_id } = await req.json();
    if (!operador_id) {
      return new Response(JSON.stringify({ error: 'Falta operador_id' }), {
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
    if (rolCaller !== 'administrador') {
      return new Response(JSON.stringify({ error: 'Solo un administrador puede eliminar un Operador de Perú' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // El trabajo de base de datos lo hace el RPC (security definer, vuelve
    // a validar el rol por su cuenta) dentro de una sola transacción --
    // aquí solo se usa el cliente `caller` para que corra con la sesión
    // real del administrador.
    const { data: idsAuth, error: rpcError } = await caller.rpc('eliminar_operador_peru', { p_operador_id: operador_id });
    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const admin = supabaseAdmin();
    const erroresAuth: string[] = [];
    for (const id of (idsAuth as string[] | null) ?? []) {
      const { error: authError } = await admin.auth.admin.deleteUser(id);
      // Los datos de la app ya se borraron/desvincularon; si una cuenta de
      // Auth puntual falla al borrarse, se deja constancia pero no se
      // revierte nada (igual que en eliminar-cliente).
      if (authError) {
        console.error(`eliminar-operador-peru: error borrando cuenta de auth ${id}`, authError);
        erroresAuth.push(id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, cuentasEliminadas: (idsAuth as string[] | null)?.length ?? 0, erroresAuth }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('eliminar-operador-peru: error inesperado', err);
    return new Response(JSON.stringify({ error: 'Error inesperado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
