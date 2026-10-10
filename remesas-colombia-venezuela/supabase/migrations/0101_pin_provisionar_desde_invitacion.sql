-- Acceso con teléfono + PIN desde un ENLACE DE INVITACIÓN, sin Google y
-- sin que un operador lo cree a mano.
--
-- `pin_provisionar` (0095) solo la puede llamar un operador/admin con
-- sesión. Pero un cliente que abre su enlace de invitación todavía no
-- tiene cuenta: la autorización aquí viene del token de invitación
-- (tipo 'cliente'), no de `auth.uid()`. Por eso se concede a `anon`,
-- igual que `registrar_prospecto` (0074): el enlace de cliente es
-- reutilizable y se comparte de forma abierta (landing de captación), así
-- que este camino queda al mismo nivel de confianza que "Continuar con
-- Google" desde ese mismo enlace.
--
-- ALTA (primera vez): el cliente ELIGE su PIN de 4 dígitos y ese queda
-- como definitivo (pin_temporal = false). No se le fuerza a cambiarlo al
-- entrar. Después puede cambiarlo cuando quiera desde su Perfil
-- (pin_definir_propio).
--
-- REENVÍO ("perdí el WhatsApp con mi PIN"): si el teléfono ya tiene una
-- fila PENDIENTE (nunca se materializó la cuenta) del MISMO negocio, se
-- ignora el PIN que mande y se genera uno TEMPORAL al azar; en el primer
-- ingreso con ese PIN la app obliga a definir el definitivo. Si el
-- teléfono ya pertenece a una cuenta real NO se toca: esa recuperación
-- pasa por el operador (`pin_regenerar`) o por Google.
--
-- Todo calificado con esquema (`public.` / `extensions.`) porque esta
-- función se aplicó a mano desde el SQL Editor, que corre con un
-- search_path distinto al de `apply_migration`.

drop function if exists pin_provisionar_desde_invitacion(text, text, text);
drop function if exists pin_provisionar_desde_invitacion(text, text, text, text);

create or replace function pin_provisionar_desde_invitacion(
  p_token text,
  p_telefono text,
  p_nombre text,
  p_pin text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  inv public.invitaciones;
  r public.acceso_pin;
  v_tel text;
  v_pin text;
  v_plan text;
  v_lim int;
  v_tope int;
  v_usados int;
begin
  v_tel := public.normalizar_telefono_e164(p_telefono);
  if v_tel is null then
    return jsonb_build_object('ok', false, 'error', 'Teléfono inválido. Escríbelo con el código de país (ej: +51 9…).');
  end if;

  select * into inv from public.invitaciones where token = p_token;
  if inv.id is null or inv.tipo <> 'cliente' or inv.negocio_operador_peru_id is null then
    return jsonb_build_object('ok', false, 'error', 'Enlace de invitación inválido.');
  end if;

  select * into r from public.acceso_pin where telefono_e164 = v_tel;
  if found then
    if r.usuario_id is not null then
      return jsonb_build_object('ok', false, 'error',
        'Ese número ya tiene una cuenta. Entra con tu número y tu PIN, o con "Continuar con Google". Si olvidaste tu PIN, pídele a tu operador que te lo reenvíe.');
    end if;
    if r.prov_negocio_id is distinct from inv.negocio_operador_peru_id then
      return jsonb_build_object('ok', false, 'error', 'Ese número ya tiene un acceso con PIN pendiente con otro operador.');
    end if;
    -- Fila pendiente del mismo negocio: recuperación -> PIN TEMPORAL al
    -- azar, se cambia en el primer ingreso.
    v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    update public.acceso_pin
      set pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
          pin_temporal = true,
          intentos_fallidos = 0,
          bloqueado_hasta = null,
          prov_nombre = coalesce(nullif(trim(p_nombre), ''), prov_nombre),
          prov_miembro_id = coalesce(inv.operador_peru_miembro_id, prov_miembro_id),
          updated_at = now()
      where id = r.id;
    return jsonb_build_object('ok', true, 'pin', v_pin, 'telefono', v_tel, 'reenvio', true);
  end if;

  -- Alta nueva: el PIN que eligió el cliente queda como definitivo.
  if p_pin !~ '^\d{4}$' then
    return jsonb_build_object('ok', false, 'error', 'El PIN debe ser exactamente 4 dígitos.');
  end if;

  -- Mismo tope de clientes que `canjear_invitacion` / `pin_provisionar`
  -- (según el plan del negocio).
  select plan, limite_clientes_unlimited into v_plan, v_lim from public.usuarios where id = inv.negocio_operador_peru_id;
  v_tope := case when v_plan in ('medida', 'unlimited') then coalesce(v_lim, 2147483647)
                 else public.limite_clientes_plan(v_plan) end;
  select
      (select count(*) from public.usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente' and eliminado_at is null)
    + (select count(*) from public.acceso_pin
        where prov_rol = 'cliente' and prov_negocio_id = inv.negocio_operador_peru_id)
    into v_usados;
  if v_usados >= v_tope then
    return jsonb_build_object('ok', false, 'error',
      'Este negocio ya alcanzó su límite de ' || v_tope || ' clientes de su plan actual.');
  end if;

  insert into public.acceso_pin (
    telefono_e164, pin_hash, pin_temporal,
    prov_rol, prov_negocio_id, prov_miembro_id, prov_nombre
  ) values (
    v_tel, extensions.crypt(p_pin, extensions.gen_salt('bf')), false,
    'cliente', inv.negocio_operador_peru_id, inv.operador_peru_miembro_id, nullif(trim(p_nombre), '')
  );

  return jsonb_build_object('ok', true, 'pin', p_pin, 'telefono', v_tel, 'reenvio', false);
end;
$$;
revoke execute on function pin_provisionar_desde_invitacion(text, text, text, text) from public;
grant execute on function pin_provisionar_desde_invitacion(text, text, text, text) to anon;
grant execute on function pin_provisionar_desde_invitacion(text, text, text, text) to authenticated;
