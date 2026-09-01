import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Login con teléfono + PIN. NO requiere JWT (el usuario todavía no tiene
 * sesión) -- se despliega con verify_jwt = false.
 *
 * Todo el control sensible (rate limit, bloqueo por intentos, hash bcrypt)
 * vive en la RPC `pin_verificar` (SECURITY DEFINER, solo service_role).
 * Acá se hace lo que SQL no puede:
 *   1. verificar el PIN,
 *   2. si la fila estaba "pendiente de provisión" (alguien que nunca
 *      inició sesión), crear auth.users + usuarios y ligar los perfiles
 *      con `pin_finalizar_provision`,
 *   3. emitir la sesión con un magic link de un solo uso que el cliente
 *      canjea con `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`.
 *
 * Google sigue disponible como acceso alternativo: esto no toca ni crea
 * identidades de Google.
 */
const EMAIL_DOMAIN = 'pin.remesas-peru-venezuela.app';

Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  try {
    const { telefono, pin } = await req.json();
    if (!telefono || !pin) return json({ error: 'Falta el teléfono o el PIN.' }, 400);

    const admin = supabaseAdmin();

    const { data: v, error: vErr } = await admin.rpc('pin_verificar', {
      p_telefono: String(telefono),
      p_pin: String(pin),
    });
    if (vErr) {
      console.error('pin-login: pin_verificar', vErr);
      return json({ error: 'No se pudo verificar el PIN.' }, 500);
    }
    if (!v?.ok) return json({ error: v?.error ?? 'PIN incorrecto.' }, 401);

    let email: string | null = null;

    if (v.modo === 'existente') {
      email = v.email ?? null;
      if (!email) {
        return json({ error: 'Esta cuenta no puede entrar con PIN. Usa "Continuar con Google".' }, 409);
      }
    } else {
      // modo === 'provision': materializar la cuenta.
      const telNorm = String(v.telefono);
      email = `${telNorm}@${EMAIL_DOMAIN}`;

      let newUserId: string | null = null;
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: v.prov_nombre ?? null },
      });
      if (created?.user) {
        newUserId = created.user.id;
      } else {
        // Reintento tras una creación previa: la fila de usuarios ya existe
        // (handle_new_user la creó con este email sintético).
        const { data: u } = await admin.from('usuarios').select('id').eq('email', email).maybeSingle();
        if (!u) {
          console.error('pin-login: createUser', cErr);
          return json({ error: 'No se pudo crear la cuenta.' }, 500);
        }
        newUserId = u.id;
      }

      const { error: fErr } = await admin.rpc('pin_finalizar_provision', {
        p_telefono: telNorm,
        p_new_user_id: newUserId,
      });
      if (fErr) {
        console.error('pin-login: pin_finalizar_provision', fErr);
        return json({ error: 'No se pudo activar la cuenta.' }, 500);
      }
    }

    const { data: link, error: lErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (lErr || !link?.properties?.hashed_token) {
      console.error('pin-login: generateLink', lErr);
      return json({ error: 'No se pudo iniciar la sesión.' }, 500);
    }

    return json({ ok: true, token_hash: link.properties.hashed_token, pin_temporal: !!v.pin_temporal });
  } catch (err) {
    console.error('pin-login: inesperado', err);
    return json({ error: 'Error inesperado.' }, 500);
  }
});
