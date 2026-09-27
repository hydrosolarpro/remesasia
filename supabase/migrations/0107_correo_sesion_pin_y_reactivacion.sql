-- Une dos piezas pendientes en una sola función final:
--
-- 1) Correo real para una cuenta creada con teléfono + PIN (lo que hacía
--    la 0102, nunca aplicada). Hasta ahora una cuenta así se materializaba
--    con un correo SINTÉTICO (<telefono>@pin.remesas-peru-venezuela.app)
--    que no sirve para "Continuar con Google" ni se ve en el Perfil. Con
--    esto la persona puede indicar su correo real al registrarse (viaja
--    como `prov_email`, y `pin-login` lo usa para crear el auth.users
--    directamente con él) o vincularlo después desde su Perfil (Edge
--    Function `vincular-correo`, ya escrita).
--
-- 2) La protección de reactivación de la 0105 (aplicada, y ahora
--    reemplazada por esta): si el teléfono ya pertenece a una cuenta dada
--    de baja, se libera para un registro nuevo -- igual que ya hace
--    canjear_invitacion() con Google (ver 0106) -- en vez de rechazarlo
--    con "ese número ya tiene una cuenta" sin salida posible.
--
-- Todo calificado con esquema porque se aplica igual que 0101/0102/0105.

alter table public.acceso_pin add column if not exists prov_email text;

-- ---------------------------------------------------------------------
-- Alta con PIN desde el enlace de invitación: acepta el correo Y libera
-- el teléfono de una cuenta dada de baja.
-- ---------------------------------------------------------------------
drop function if exists public.pin_provisionar_desde_invitacion(text, text, text, text);
drop function if exists public.pin_provisionar_desde_invitacion(text, text, text, text, text);

create or replace function public.pin_provisionar_desde_invitacion(
  p_token text,
  p_telefono text,
  p_nombre text,
  p_pin text,
  p_email text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  inv public.invitaciones;
  r public.acceso_pin;
  v_tel text;
  v_pin text;
  v_email text;
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

  -- Correo opcional: si viene, debe tener forma de correo y no ser uno de
  -- los sintéticos internos.
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is not null then
    if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       or v_email like '%@pin.remesas-peru-venezuela.app' then
      return jsonb_build_object('ok', false, 'error', 'El correo no es válido.');
    end if;
    if exists (select 1 from public.usuarios where lower(email) = v_email) then
      return jsonb_build_object('ok', false, 'error',
        'Ese correo ya tiene una cuenta. Entra con "Continuar con Google" usando ese correo, o regístrate sin correo y agrégalo luego desde tu Perfil.');
    end if;
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
      -- registrarse de nuevo, como cliente nuevo, con el PIN (y correo)
      -- que elija ahora.
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
            prov_email = v_email,
            updated_at = now()
        where id = r.id;
      return jsonb_build_object('ok', true, 'pin', p_pin, 'telefono', v_tel, 'reenvio', false);
    end if;

    if r.prov_negocio_id is distinct from inv.negocio_operador_peru_id then
      return jsonb_build_object('ok', false, 'error', 'Ese número ya tiene un acceso con PIN pendiente con otro operador.');
    end if;
    -- Fila pendiente del mismo negocio: recuperación -> PIN TEMPORAL al
    -- azar, se cambia en el primer ingreso. Si mandó un correo nuevo, se
    -- guarda para materializar la cuenta con él.
    v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
    update public.acceso_pin
      set pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
          pin_temporal = true,
          intentos_fallidos = 0,
          bloqueado_hasta = null,
          prov_nombre = coalesce(nullif(trim(p_nombre), ''), prov_nombre),
          prov_email = coalesce(v_email, prov_email),
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
    prov_rol, prov_negocio_id, prov_miembro_id, prov_nombre, prov_email
  ) values (
    v_tel, extensions.crypt(p_pin, extensions.gen_salt('bf')), false,
    'cliente', inv.negocio_operador_peru_id, inv.operador_peru_miembro_id, nullif(trim(p_nombre), ''), v_email
  );

  return jsonb_build_object('ok', true, 'pin', p_pin, 'telefono', v_tel, 'reenvio', false);
end;
$$;
revoke execute on function public.pin_provisionar_desde_invitacion(text, text, text, text, text) from public;
grant execute on function public.pin_provisionar_desde_invitacion(text, text, text, text, text) to anon;
grant execute on function public.pin_provisionar_desde_invitacion(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- pin_verificar: en modo "provision" ahora también devuelve prov_email
-- para que `pin-login` cree el auth.users con el correo real si lo hay.
-- (Copia de 0095 + una línea; el resto del comportamiento no cambia.)
-- ---------------------------------------------------------------------
create or replace function public.pin_verificar(p_telefono text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  r public.acceso_pin;
  v_tel text;
  v_email text;
begin
  v_tel := public.normalizar_telefono_e164(p_telefono);
  if v_tel is null then return jsonb_build_object('ok', false, 'error', 'Teléfono inválido.'); end if;

  select * into r from public.acceso_pin where telefono_e164 = v_tel for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No hay un acceso con PIN para ese teléfono.');
  end if;

  if r.bloqueado_hasta is not null and r.bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'error',
      'Demasiados intentos. Vuelve a probar en ' || ceil(extract(epoch from (r.bloqueado_hasta - now())) / 60)::int || ' min.');
  end if;

  if extensions.crypt(p_pin, r.pin_hash) <> r.pin_hash then
    update public.acceso_pin
      set intentos_fallidos = intentos_fallidos + 1,
          bloqueado_hasta = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueado_hasta end
      where id = r.id;
    return jsonb_build_object('ok', false, 'error', 'PIN incorrecto.');
  end if;

  update public.acceso_pin set intentos_fallidos = 0, bloqueado_hasta = null where id = r.id;

  if r.usuario_id is not null then
    select email into v_email from public.usuarios where id = r.usuario_id;
    return jsonb_build_object(
      'ok', true, 'modo', 'existente',
      'usuario_id', r.usuario_id, 'email', v_email, 'pin_temporal', r.pin_temporal
    );
  end if;

  return jsonb_build_object(
    'ok', true, 'modo', 'provision',
    'telefono', r.telefono_e164, 'pin_temporal', r.pin_temporal,
    'prov_rol', r.prov_rol, 'prov_nombre', r.prov_nombre, 'prov_email', r.prov_email
  );
end;
$$;
revoke execute on function public.pin_verificar(text, text) from public;
grant execute on function public.pin_verificar(text, text) to service_role;
