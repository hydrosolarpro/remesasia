-- Un cliente dado de baja (el mismo desde su Perfil, o eliminado por su
-- operador -- ver supabase/functions/eliminar-cliente) no podía volver a
-- registrarse abriendo el MISMO enlace de invitación con su MISMO teléfono:
-- `pin_provisionar_desde_invitacion` veía `acceso_pin.usuario_id` todavía
-- apuntando a su fila vieja (eliminar-cliente nunca lo limpia) y rechazaba
-- con "Ese número ya tiene una cuenta" -- sin importar que esa cuenta
-- estuviera dada de baja. Y esa misma cuenta tampoco puede entrar con PIN
-- (usuarios.email quedó en null, pin_verificar/pin-login la bloquean) --
-- quedaba sin ninguna salida.
--
-- Mismo criterio que ya usa Google (canjear_invitacion + el comentario de
-- eliminar-cliente: "se registra como cliente nuevo desde cero"): si el
-- teléfono está ligado a una cuenta dada de baja, se libera para un
-- registro nuevo con el PIN que el cliente elija ahora.

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
  v_eliminado_at timestamptz;
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
      select eliminado_at into v_eliminado_at from public.usuarios where id = r.usuario_id;

      if v_eliminado_at is null then
        return jsonb_build_object('ok', false, 'error',
          'Ese número ya tiene una cuenta. Entra con tu número y tu PIN, o con "Continuar con Google". Si olvidaste tu PIN, pídele a tu operador que te lo reenvíe.');
      end if;

      -- Esa cuenta fue dada de baja: el teléfono queda libre para
      -- registrarse de nuevo, como cliente nuevo, con el PIN que elija
      -- ahora (misma validación de cupo que el alta nueva, más abajo).
      if p_pin !~ '^\d{4}$' then
        return jsonb_build_object('ok', false, 'error', 'El PIN debe ser exactamente 4 dígitos.');
      end if;

      select plan, limite_clientes_unlimited into v_plan, v_lim from public.usuarios where id = inv.negocio_operador_peru_id;
      v_tope := case when v_plan in ('medida', 'unlimited') then coalesce(v_lim, 2147483647)
                     else public.limite_clientes_plan(v_plan) end;
      select
          (select count(*) from public.usuarios
            where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente' and eliminado_at is null)
        + (select count(*) from public.acceso_pin
            where prov_rol = 'cliente' and prov_negocio_id = inv.negocio_operador_peru_id and usuario_id is null and id <> r.id)
        into v_usados;
      if v_usados >= v_tope then
        return jsonb_build_object('ok', false, 'error',
          'Este negocio ya alcanzó su límite de ' || v_tope || ' clientes de su plan actual.');
      end if;

      update public.acceso_pin
        set usuario_id = null,
            pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
            pin_temporal = false,
            intentos_fallidos = 0,
            bloqueado_hasta = null,
            prov_rol = 'cliente',
            prov_negocio_id = inv.negocio_operador_peru_id,
            prov_miembro_id = inv.operador_peru_miembro_id,
            prov_nombre = nullif(trim(p_nombre), ''),
            updated_at = now()
        where id = r.id;
      return jsonb_build_object('ok', true, 'pin', p_pin, 'telefono', v_tel, 'reenvio', false);
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

  select plan, limite_clientes_unlimited into v_plan, v_lim from public.usuarios where id = inv.negocio_operador_peru_id;
  v_tope := case when v_plan in ('medida', 'unlimited') then coalesce(v_lim, 2147483647)
                 else public.limite_clientes_plan(v_plan) end;
  select
      (select count(*) from public.usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente' and eliminado_at is null)
    + (select count(*) from public.acceso_pin
        where prov_rol = 'cliente' and prov_negocio_id = inv.negocio_operador_peru_id and usuario_id is null)
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
