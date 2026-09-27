import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { supabaseCaller } from '../_shared/supabaseCaller.ts';
import { corsHeaders, manejarPreflight } from '../_shared/cors.ts';

/**
 * Vincula un CORREO REAL a la cuenta de quien llama (sesión ya activa).
 *
 * Una cuenta creada con teléfono + PIN nace con un correo sintético
 * (<telefono>@pin.remesas-peru-venezuela.app) que no sirve para
 * "Continuar con Google" ni dice nada en el Perfil. Acá la persona pone su
 * correo de verdad: se cambia el correo del `auth.users` (dejándolo
 * confirmado) y el de `public.usuarios`. Desde ese momento ese mismo
 * correo también sirve para entrar con Google (la identidad de Google se
 * enlaza a esta cuenta porque el correo coincide y está confirmado).
 *
 * NO verifica que el buzón exista: si la persona se equivoca, el acceso
 * con PIN sigue funcionando y puede corregir el correo desde su Perfil.
 * verify_jwt = true (por defecto): requiere sesión.
 */
const DOMINIO_SINTETICO = 'pin.remesas-peru-venezuela.app';
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const preflight = manejarPreflight(req);
  if (preflight) return preflight;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  try {
    const { correo } = await req.json();
    const email = String(correo ?? '').trim().toLowerCase();

    if (!RE_EMAIL.test(email)) {
      return json({ error: 'Escribe un correo válido (ejemplo: nombre@gmail.com).' }, 400);
    }
    if (email.endsWith(`@${DOMINIO_SINTETICO}`)) {
      return json({ error: 'Ese no es un correo real. Usa tu correo personal (Gmail, etc.).' }, 400);
    }

    const caller = supabaseCaller(req);
    const {
      data: { user },
    } = await caller.auth.getUser();
    if (!user) return json({ error: 'No autenticado.' }, 401);
    const uid = user.id;

    if ((user.email ?? '').toLowerCase() === email) {
      return json({ ok: true, email }); // ya es su correo, nada que hacer
    }

    const admin = supabaseAdmin();

    // ¿Ese correo ya pertenece a otra cuenta?
    const { data: otro } = await admin.from('usuarios').select('id').ilike('email', email).maybeSingle();
    if (otro && otro.id !== uid) {
      return json(
        {
          error:
            'Ese correo ya pertenece a otra cuenta. Si es tuyo, entra con "Continuar con Google" usando ese correo.',
        },
        409
      );
    }

    const { error: aErr } = await admin.auth.admin.updateUserById(uid, { email, email_confirm: true });
    if (aErr) {
      console.error('vincular-correo: updateUserById', aErr);
      const yaEnUso = /already|registered|exist|taken/i.test(aErr.message ?? '');
      return json(
        {
          error: yaEnUso
            ? 'Ese correo ya está en uso. Si es tuyo, entra con "Continuar con Google" usando ese correo.'
            : 'No se pudo vincular el correo. Revísalo e inténtalo de nuevo.',
        },
        409
      );
    }

    const { error: uErr } = await admin.from('usuarios').update({ email }).eq('id', uid);
    if (uErr) {
      console.error('vincular-correo: update usuarios', uErr);
      return json({ error: 'El correo se cambió pero no se pudo actualizar tu perfil. Vuelve a intentarlo.' }, 500);
    }

    return json({ ok: true, email });
  } catch (err) {
    console.error('vincular-correo: inesperado', err);
    return json({ error: 'Error inesperado.' }, 500);
  }
});
