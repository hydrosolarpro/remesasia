-- DEMO inmediato desde la landing: al completar el formulario, la Edge
-- Function `demo-operador` crea la cuenta (auth.users) y llama a esta RPC,
-- que la deja como Operador Perú principal en plan DEMO de 7 días, con
-- acceso concedido y con el teléfono/nombre del formulario -- sin que el
-- admin valide nada. Aparece en Panel de Control como cualquier operador.
--
-- Solo service_role puede ejecutarla (la invoca la Edge Function). Es
-- SECURITY DEFINER para pasar el trigger usuarios_protege_plan (que solo
-- deja tocar rol/plan/acceso_concedido/demo_inicio a postgres o admin).
create or replace function demo_activar_operador(p_token text, p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  pro prospectos;
  v_rol rol;
begin
  select * into inv from invitaciones
    where token = p_token and tipo = 'operador_peru' and usado_por is null and prospecto_id is not null;
  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  select * into pro from prospectos where id = inv.prospecto_id;

  select rol into v_rol from usuarios where id = p_user_id;
  -- Solo cuentas recién creadas (rol 'cliente' por defecto): nunca pisa a
  -- un admin, operador de Venezuela o miembro de equipo pre-registrado.
  if v_rol is distinct from 'cliente' then
    return jsonb_build_object('ok', false, 'error', 'La cuenta no es elegible para el DEMO directo.');
  end if;

  update usuarios
    set rol = 'operador_peru',
        plan = 'demo',
        acceso_concedido = true,
        demo_inicio = now(),
        telefono = coalesce(nullif(trim(pro.telefono), ''), telefono),
        nombre = coalesce(nullif(trim(pro.nombre), ''), nombre)
    where id = p_user_id;

  update invitaciones set usado_por = p_user_id, used_at = now() where id = inv.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function demo_activar_operador(text, uuid) from public, anon, authenticated;
grant execute on function demo_activar_operador(text, uuid) to service_role;
