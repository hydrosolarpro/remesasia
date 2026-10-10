import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * DEMO inmediato desde la landing. NO requiere JWT (el visitante no tiene
 * cuenta) -- se despliega con verify_jwt = false.
 *
 * Recibe el token de la invitación 'operador_peru' que acaba de generar
 * `registrar_prospecto`, crea la cuenta con el correo del formulario, la
 * activa como Operador Perú principal en DEMO de 7 días (RPC
 * `demo_activar_operador`) y devuelve un token_hash de magic link de un solo
 * uso que la app canjea con `verifyOtp` (mismo mecanismo que `pin-login`).
 *
 * Si el correo ya tiene cuenta NO se toca ni se inicia sesión en ella
 * (evita entrar a una cuenta ajena escribiendo su correo): se responde
 * `existe: true` y la landing cae al flujo normal con Google.
 */
Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') return json({ error: 'Falta el token.' }, 400);

    const admin = supabaseAdmin();

    const { data: inv } = await admin
      .from('invitaciones')
      .select('token, prospectos(nombre, email)')
      .eq('token', token)
      .eq('tipo', 'operador_peru')
      .is('usado_por', null)
      .not('prospecto_id', 'is', null)
      .maybeSingle();
    const prospecto = (inv as unknown as { prospectos: { nombre: string; email: string } | null } | null)?.prospectos;
    if (!prospecto?.email) return json({ error: 'Invitación inválida o ya usada.' }, 404);

    const email = prospecto.email.trim().toLowerCase();

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: prospecto.nombre },
    });
    if (cErr || !created?.user) {
      // Correo ya registrado (o inválido): se usa el flujo con Google.
      console.error('demo-operador: createUser', cErr);
      return json({ ok: false, existe: true });
    }

    const { data: act, error: aErr } = await admin.rpc('demo_activar_operador', {
      p_token: token,
      p_user_id: created.user.id,
    });
    if (aErr || !act?.ok) {
      console.error('demo-operador: demo_activar_operador', aErr, act);
      return json({ ok: false, error: act?.error ?? 'No se pudo activar el DEMO.' }, 500);
    }

    const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (lErr || !link?.properties?.hashed_token) {
      console.error('demo-operador: generateLink', lErr);
      return json({ ok: false, error: 'No se pudo iniciar la sesión.' }, 500);
    }

    return json({ ok: true, token_hash: link.properties.hashed_token });
  } catch (err) {
    console.error('demo-operador: inesperado', err);
    return json({ error: 'Error inesperado.' }, 500);
  }
});
