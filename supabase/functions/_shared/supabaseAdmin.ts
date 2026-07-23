import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Cliente con service_role — solo para uso dentro de Edge Functions (bypassa RLS).
 * SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY están disponibles automáticamente
 * en el entorno de cada función desplegada en Supabase.
 */
export function supabaseAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}
