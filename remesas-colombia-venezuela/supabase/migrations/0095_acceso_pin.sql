-- ACCESO CON TELÉFONO + PIN (alternativo a "Continuar con Google")
--
-- El PIN es una credencial ADICIONAL sobre la misma cuenta, no una
-- identidad paralela: cada persona sigue teniendo un único auth.users +
-- una única fila en `usuarios`. Google sigue disponible como acceso
-- alternativo para todos.
--
-- El PIN (4 dígitos) se guarda solo hasheado con bcrypt (pgcrypto). Toda
-- verificación y todo cambio pasa por funciones SECURITY DEFINER; el hash
-- nunca sale de la base. `pin_verificar` (rate limit + bloqueo por
-- intentos) y `pin_finalizar_provision` solo las invoca la Edge Function
-- `pin-login` con service_role.
--
-- Recuperación ("olvidé mi PIN"): el Operador Perú del negocio (o el
-- admin) genera un PIN temporal con `pin_regenerar` y lo reenvía por un
-- enlace wa.me; en el primer ingreso con ese PIN temporal la app obliga a
-- definir uno nuevo.
--
-- Provisión sin Google: un operador puede activarle el acceso con PIN a
-- alguien que nunca inició sesión (equipo Perú, operador Venezuela o
-- cliente) con `pin_provisionar`. La cuenta real (auth.users + usuarios)
-- se crea "just-in-time" en el primer login, dentro de `pin-login`.

create extension if not exists pgcrypto;

-- Normaliza un teléfono a E.164 sin '+' (dígitos con código de país).
-- Autocompleta Perú (+51, 9 dígitos, celular que empieza en 9) y
-- Venezuela (+58, 10 dígitos que empiezan en 4, con o sin 0 local).
-- Cualquier otro caso debe venir ya con código de país.
create or replace function normalizar_telefono_e164(p_tel text) returns text
language plpgsql immutable as $$
declare d text;
begin
  if p_tel is null then return null; end if;
  d := regexp_replace(p_tel, '\D', '', 'g');
  if d = '' then return null; end if;
  if left(d, 2) = '51' and length(d) = 11 then return d; end if;          -- +51 ya puesto
  if left(d, 2) = '58' and length(d) = 12 then return d; end if;          -- +58 ya puesto
  if left(d, 1) = '0'  and length(d) = 11 then return '58' || substr(d, 2); end if; -- VE local 04xx…
  if left(d, 1) = '9'  and length(d) = 9  then return '51' || d; end if;  -- PE celular 9xxxxxxxx
  if left(d, 1) = '4'  and length(d) = 10 then return '58' || d; end if;  -- VE 4xx sin 0 ni código
  if length(d) between 11 and 15 then return d; end if;                   -- ya parece completo
  return null;
end;
$$;

create table acceso_pin (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  telefono_e164 text not null unique,
  pin_hash text not null,
  pin_temporal boolean not null default false,
  intentos_fallidos int not null default 0,
  bloqueado_hasta timestamptz,
  -- Metadatos para crear la cuenta "just-in-time" en el primer login de
  -- alguien provisionado por su operador (usuario_id sigue null hasta ahí).
  prov_rol rol,
  prov_negocio_id uuid references usuarios(id) on delete set null,
  prov_miembro_id uuid references operador_peru_miembro(id) on delete set null,
  prov_ve_perfil_id uuid references operador_venezuela_perfil(id) on delete set null,
  prov_pe_miembro_id uuid references operador_peru_miembro(id) on delete set null,
  prov_nombre text,
  creado_por uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una cuenta ya vinculada tiene como mucho un PIN.
create unique index acceso_pin_usuario_unico on acceso_pin (usuario_id) where usuario_id is not null;

alter table acceso_pin enable row level security;
-- Sin políticas a propósito: nada de PostgREST directo. Todo pasa por las
-- funciones de abajo o por la Edge Function con service_role.

-- ¿El operador/admin actual puede gestionar el PIN de p_usuario_id?
-- (admin: cualquiera; operador principal: él mismo, su equipo Perú, sus
-- operadores de Venezuela y sus clientes).
create or replace function puede_gestionar_pin(p_usuario_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select rol_actual() = 'administrador'
     or p_usuario_id = mi_negocio_operador_peru_id()
     or exists (select 1 from usuarios u
                where u.id = p_usuario_id and u.negocio_operador_peru_id = mi_negocio_operador_peru_id())
     or exists (select 1 from operador_peru_miembro m
                where m.usuario_id = p_usuario_id and m.operador_peru_id = mi_negocio_operador_peru_id())
     or exists (select 1 from operador_venezuela_perfil v
                where v.usuario_id = p_usuario_id and v.operador_peru_id = mi_negocio_operador_peru_id());
$$;
revoke execute on function puede_gestionar_pin(uuid) from public;
grant execute on function puede_gestionar_pin(uuid) to authenticated;

-- =====================================================================
-- Consulta de estado (para la UI, sin exponer el hash)
-- =====================================================================

create or replace function tengo_pin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from acceso_pin where usuario_id = auth.uid());
$$;
revoke execute on function tengo_pin() from public;
grant execute on function tengo_pin() to authenticated;

-- Estado del PIN de un usuario del propio negocio (o cualquiera si admin):
-- si tiene PIN, si es temporal y su teléfono. Para el panel del operador.
create or replace function pin_estado_usuario(p_usuario_id uuid) returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare r record;
begin
  if not puede_gestionar_pin(p_usuario_id) then
    return jsonb_build_object('error', 'no_autorizado');
  end if;

  select telefono_e164, pin_temporal into r from acceso_pin where usuario_id = p_usuario_id;
  if not found then return jsonb_build_object('tiene_pin', false); end if;
  return jsonb_build_object('tiene_pin', true, 'pin_temporal', r.pin_temporal, 'telefono', r.telefono_e164);
end;
$$;
revoke execute on function pin_estado_usuario(uuid) from public;
grant execute on function pin_estado_usuario(uuid) to authenticated;

-- =====================================================================
-- Definir / cambiar el PIN
-- =====================================================================

-- Self-service: el usuario logueado define o cambia su propio PIN.
create or replace function pin_definir_propio(p_telefono text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_tel text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_pin !~ '^\d{4}$' then raise exception 'El PIN debe ser exactamente 4 dígitos.'; end if;
  v_tel := normalizar_telefono_e164(p_telefono);
  if v_tel is null then raise exception 'Teléfono inválido. Escríbelo con el código de país (ej: +51 9…).'; end if;
  if exists (select 1 from acceso_pin where telefono_e164 = v_tel and usuario_id is distinct from auth.uid()) then
    raise exception 'Ese teléfono ya tiene un PIN en otra cuenta.';
  end if;

  delete from acceso_pin where usuario_id = auth.uid();
  insert into acceso_pin (usuario_id, telefono_e164, pin_hash, pin_temporal)
  values (auth.uid(), v_tel, crypt(p_pin, gen_salt('bf')), false);

  update usuarios set telefono = coalesce(nullif(trim(telefono), ''), v_tel) where id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function pin_definir_propio(text, text) from public;
grant execute on function pin_definir_propio(text, text) to authenticated;

-- Operador Perú (dueño del negocio) o admin: genera un PIN temporal para
-- un usuario que YA tiene acceso_pin (caso "olvidé mi PIN"). Devuelve el
-- PIN en claro una sola vez para armar el enlace wa.me.
create or replace function pin_regenerar(p_usuario_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_pin text; v_tel text;
begin
  if not puede_gestionar_pin(p_usuario_id) then
    raise exception 'No autorizado para regenerar el PIN de este usuario.';
  end if;

  v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
  update acceso_pin
    set pin_hash = crypt(v_pin, gen_salt('bf')), pin_temporal = true,
        intentos_fallidos = 0, bloqueado_hasta = null, updated_at = now()
    where usuario_id = p_usuario_id
    returning telefono_e164 into v_tel;
  if not found then raise exception 'Este usuario todavía no tiene un acceso con PIN.'; end if;

  return jsonb_build_object('ok', true, 'pin', v_pin, 'telefono', v_tel);
end;
$$;
revoke execute on function pin_regenerar(uuid) from public;
grant execute on function pin_regenerar(uuid) to authenticated;

-- Operador Perú / admin: activa acceso con PIN para alguien que NUNCA
-- inició sesión. Crea una fila "pendiente" (usuario_id null); la cuenta
-- real se materializa en el primer login (ver pin-login).
--   p_tipo IN ('cliente','operador_venezuela','operador_peru_miembro')
--   p_ref_id: para 'operador_venezuela' = operador_venezuela_perfil.id
--             para 'operador_peru_miembro' = operador_peru_miembro.id
--             para 'cliente' = operador_peru_miembro.id que lo invita (o null)
create or replace function pin_provisionar(p_tipo text, p_ref_id uuid, p_telefono text, p_nombre text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tel text;
  v_pin text;
  v_negocio uuid;
  v_ve uuid; v_pe uuid; v_miembro uuid; v_rol rol;
begin
  if rol_actual() not in ('administrador', 'operador_peru') then
    raise exception 'Solo el operador principal o el administrador pueden activar accesos con PIN.';
  end if;
  v_negocio := case when rol_actual() = 'operador_peru' then auth.uid() else null end;

  v_tel := normalizar_telefono_e164(p_telefono);
  if v_tel is null then raise exception 'Teléfono inválido. Escríbelo con el código de país.'; end if;
  if exists (select 1 from acceso_pin where telefono_e164 = v_tel) then
    raise exception 'Ese teléfono ya tiene un acceso con PIN.';
  end if;

  if p_tipo = 'operador_venezuela' then
    select operador_peru_id into v_negocio from operador_venezuela_perfil where id = p_ref_id;
    if v_negocio is null then raise exception 'Operador de Venezuela no encontrado.'; end if;
    if rol_actual() = 'operador_peru' and v_negocio <> auth.uid() then raise exception 'Ese operador no es de tu negocio.'; end if;
    v_ve := p_ref_id; v_rol := 'operador_venezuela';
  elsif p_tipo = 'operador_peru_miembro' then
    select operador_peru_id into v_negocio from operador_peru_miembro where id = p_ref_id;
    if v_negocio is null then raise exception 'Miembro de equipo no encontrado.'; end if;
    if rol_actual() = 'operador_peru' and v_negocio <> auth.uid() then raise exception 'Ese miembro no es de tu equipo.'; end if;
    v_pe := p_ref_id; v_rol := 'operador_peru_miembro';
  elsif p_tipo = 'cliente' then
    if v_negocio is null then raise exception 'Solo el operador principal puede provisionar clientes.'; end if;
    if p_ref_id is not null then
      if not exists (select 1 from operador_peru_miembro where id = p_ref_id and operador_peru_id = v_negocio) then
        raise exception 'El miembro que invita no es de tu equipo.';
      end if;
      v_miembro := p_ref_id;
    end if;
    -- Mismo tope de clientes que canjear_invitacion (según el plan del negocio).
    declare
      v_tope int;
      v_plan text;
      v_lim int;
    begin
      select plan, limite_clientes_unlimited into v_plan, v_lim from usuarios where id = v_negocio;
      v_tope := case when v_plan in ('medida', 'unlimited') then coalesce(v_lim, 2147483647)
                     else limite_clientes_plan(v_plan) end;
      if (select count(*) from usuarios where negocio_operador_peru_id = v_negocio and rol = 'cliente' and eliminado_at is null)
         + (select count(*) from acceso_pin where prov_rol = 'cliente' and prov_negocio_id = v_negocio) >= v_tope then
        raise exception 'Este negocio ya alcanzó su límite de % clientes de su plan actual.', v_tope;
      end if;
    end;
    v_rol := 'cliente';
  else
    raise exception 'Tipo de acceso no válido.';
  end if;

  v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
  insert into acceso_pin (
    telefono_e164, pin_hash, pin_temporal,
    prov_rol, prov_negocio_id, prov_miembro_id, prov_ve_perfil_id, prov_pe_miembro_id, prov_nombre, creado_por
  ) values (
    v_tel, crypt(v_pin, gen_salt('bf')), true,
    v_rol, v_negocio, v_miembro, v_ve, v_pe, nullif(trim(p_nombre), ''), auth.uid()
  );

  return jsonb_build_object('ok', true, 'pin', v_pin, 'telefono', v_tel);
end;
$$;
revoke execute on function pin_provisionar(text, uuid, text, text) from public;
grant execute on function pin_provisionar(text, uuid, text, text) to authenticated;

-- =====================================================================
-- Solo para la Edge Function pin-login (service_role)
-- =====================================================================

-- Verifica teléfono + PIN con rate limit / bloqueo por intentos. NO crea
-- sesión (eso lo hace la Edge Function). Si la fila está "pendiente"
-- (usuario_id null) devuelve los datos de provisión para materializarla.
create or replace function pin_verificar(p_telefono text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r acceso_pin;
  v_tel text;
  v_email text;
begin
  v_tel := normalizar_telefono_e164(p_telefono);
  if v_tel is null then return jsonb_build_object('ok', false, 'error', 'Teléfono inválido.'); end if;

  select * into r from acceso_pin where telefono_e164 = v_tel for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No hay un acceso con PIN para ese teléfono.');
  end if;

  if r.bloqueado_hasta is not null and r.bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'error',
      'Demasiados intentos. Vuelve a probar en ' || ceil(extract(epoch from (r.bloqueado_hasta - now())) / 60)::int || ' min.');
  end if;

  if crypt(p_pin, r.pin_hash) <> r.pin_hash then
    update acceso_pin
      set intentos_fallidos = intentos_fallidos + 1,
          bloqueado_hasta = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueado_hasta end
      where id = r.id;
    return jsonb_build_object('ok', false, 'error', 'PIN incorrecto.');
  end if;

  update acceso_pin set intentos_fallidos = 0, bloqueado_hasta = null where id = r.id;

  if r.usuario_id is not null then
    select email into v_email from usuarios where id = r.usuario_id;
    return jsonb_build_object(
      'ok', true, 'modo', 'existente',
      'usuario_id', r.usuario_id, 'email', v_email, 'pin_temporal', r.pin_temporal
    );
  end if;

  -- Pendiente de provisión: la Edge Function creará la cuenta.
  return jsonb_build_object(
    'ok', true, 'modo', 'provision',
    'telefono', r.telefono_e164, 'pin_temporal', r.pin_temporal,
    'prov_rol', r.prov_rol, 'prov_nombre', r.prov_nombre
  );
end;
$$;
revoke execute on function pin_verificar(text, text) from public;
grant execute on function pin_verificar(text, text) to service_role;

-- Materializa la cuenta pendiente: liga acceso_pin al nuevo auth.users,
-- fija rol / negocio / vínculos de perfil y limpia los metadatos prov_*.
create or replace function pin_finalizar_provision(p_telefono text, p_new_user_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r acceso_pin; v_tel text;
begin
  v_tel := normalizar_telefono_e164(p_telefono);
  select * into r from acceso_pin where telefono_e164 = v_tel for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'acceso_pin no encontrado'); end if;
  if r.usuario_id is not null then
    return jsonb_build_object('ok', true, 'usuario_id', r.usuario_id); -- ya materializada (carrera)
  end if;

  update usuarios
    set rol = coalesce(r.prov_rol, 'cliente'),
        nombre = coalesce(nullif(trim(r.prov_nombre), ''), nombre),
        telefono = coalesce(nullif(trim(telefono), ''), v_tel),
        negocio_operador_peru_id = case when r.prov_rol = 'cliente' then r.prov_negocio_id else negocio_operador_peru_id end,
        invitado_por_operador_miembro_id = case when r.prov_rol = 'cliente' then r.prov_miembro_id else invitado_por_operador_miembro_id end
    where id = p_new_user_id;

  if r.prov_ve_perfil_id is not null then
    update operador_venezuela_perfil set usuario_id = p_new_user_id where id = r.prov_ve_perfil_id and usuario_id is null;
  end if;
  if r.prov_pe_miembro_id is not null then
    update operador_peru_miembro set usuario_id = p_new_user_id where id = r.prov_pe_miembro_id and usuario_id is null;
  end if;

  update acceso_pin
    set usuario_id = p_new_user_id,
        prov_rol = null, prov_negocio_id = null, prov_miembro_id = null,
        prov_ve_perfil_id = null, prov_pe_miembro_id = null, prov_nombre = null,
        updated_at = now()
    where id = r.id;

  return jsonb_build_object('ok', true, 'usuario_id', p_new_user_id);
end;
$$;
revoke execute on function pin_finalizar_provision(text, uuid) from public;
grant execute on function pin_finalizar_provision(text, uuid) to service_role;
