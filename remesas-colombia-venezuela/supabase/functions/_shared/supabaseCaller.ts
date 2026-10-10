import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Cliente que actúa como el usuario autenticado que hizo la llamada
 * (respeta RLS), a partir del header Authorization que ya validó Supabase
 * (verify_jwt). Sirve para reutilizar funciones como rol_actual()/
 * mi_negocio_operador_peru_id() sin reimplementar esa lógica en JS.
 */
export function supabaseCaller(req: Request) {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}
