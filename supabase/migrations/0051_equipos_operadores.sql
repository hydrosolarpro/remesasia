-- ─────────────────────────────────────────────────────────────
-- 0051 — Sesiones diferenciadas: Operador Principal de Perú,
--         Operadores de Perú miembros y Operadores de Venezuela.
--
-- Modelo resultante:
--   * operador_peru (dueño / "Operador principal de Perú"): publica la
--     tasa, atiende a sus propios clientes, DERIVA solicitudes a miembros
--     del equipo de Perú, y asigna a cada Operador Venezuela los miembros
--     de Perú que le corresponden.
--   * operador_peru_miembro ("Operador de Perú miembro"): tiene sus
--     propios clientes (los invita él), atiende sus operaciones y las que
--     el principal le deriva.
--   * operador_venezuela: ve solo las operaciones de los miembros de Perú
--     que le fueron asignados por el principal.
--
-- Idempotente a propósito (drop policy if exists / add column if not
-- exists): la base en producción se ha ido ajustando a mano y algunos
-- objetos pueden existir o no.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- operador_peru_miembro — equipo de Perú del negocio. Se crea if not
-- exists porque históricamente se creó a mano en producción.
-- ─────────────────────────────────────────────────────────────
create table if not exists operador_peru_miembro (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null references usuarios (id) on delete cascade,
  nombre text not null default '',
  telefono text,
  email text,
  usuario_id uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Asignación directa: a qué Operador de Venezuela le corresponde atender
-- las operaciones de este miembro de Perú (la hace el operador principal).
alter table operador_peru_miembro add column if not exists operador_venezuela_id uuid
  references operador_venezuela_perfil (id);

create index if not exists idx_opm_usuario on operador_peru_miembro (usuario_id);
create index if not exists idx_opm_operador_venezuela on operador_peru_miembro (operador_venezuela_id);

drop trigger if exists trg_operador_peru_miembro_updated_at on operador_peru_miembro;
create trigger trg_operador_peru_miembro_updated_at
  before update on operador_peru_miembro
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Operador Venezuela: un negocio puede tener varios (antes era UNO por
-- negocio por el constraint UNIQUE). Cada uno atiende a los miembros de
-- Perú que el principal le asigna.
-- ─────────────────────────────────────────────────────────────
alter table operador_venezuela_perfil drop constraint if exists operador_venezuela_perfil_operador_peru_id_key;

-- ─────────────────────────────────────────────────────────────
-- usuarios: qué miembro de Perú invitó a este cliente (para ligar cada
-- operación a su operador de Perú de origen).
-- ─────────────────────────────────────────────────────────────
alter table usuarios add column if not exists invitado_por_operador_miembro_id uuid
  references operador_peru_miembro (id);

create index if not exists idx_usuarios_invitado_por_miembro on usuarios (invitado_por_operador_miembro_id);

-- ─────────────────────────────────────────────────────────────
-- solicitudes: qué operador de Perú (miembro) atiende la operación y si
-- fue derivada por el operador principal.
-- ─────────────────────────────────────────────────────────────
alter table solicitudes add column if not exists operador_peru_miembro_id uuid
  references operador_peru_miembro (id);

alter table solicitudes add column if not exists derivada_de_principal boolean not null default false;

create index if not exists idx_solicitudes_opm on solicitudes (operador_peru_miembro_id);
create index if not exists idx_solicitudes_derivada on solicitudes (derivada_de_principal);

-- Al crear la solicitud, la liga automáticamente al miembro de Perú que
-- invitó a ese cliente (si es que lo invitó un miembro; si el cliente es
-- del principal, queda en NULL y se atiende como operación del principal).
create or replace function asignar_operador_miembro_a_solicitud() returns trigger as $$
begin
  select invitado_por_operador_miembro_id into new.operador_peru_miembro_id
    from usuarios
    where id = new.cliente_id;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists trg_asignar_operador_miembro_a_solicitud on solicitudes;
create trigger trg_asignar_operador_miembro_a_solicitud
  before insert on solicitudes
  for each row execute function asignar_operador_miembro_a_solicitud();

-- ─────────────────────────────────────────────────────────────
-- invitaciones: registrar qué miembro de Perú generó la invitación de
-- cliente (así canjear_invitacion puede ligar al cliente con su operador).
-- ─────────────────────────────────────────────────────────────
alter table invitaciones add column if not exists operador_peru_miembro_id uuid
  references operador_peru_miembro (id);

-- ─────────────────────────────────────────────────────────────
-- mi_negocio_operador_peru_id(): el miembro de Perú pertenece al negocio
-- de su operador_peru_id.
-- ─────────────────────────────────────────────────────────────
create or replace function mi_negocio_operador_peru_id() returns uuid
language sql stable security definer set search_path = public as $$
  select case (select rol from usuarios where id = auth.uid())
    when 'operador_peru' then auth.uid()
    when 'operador_venezuela' then (
      select operador_peru_id from operador_venezuela_perfil where usuario_id = auth.uid()
    )
    when 'operador_peru_miembro' then (
      select operador_peru_id from operador_peru_miembro where usuario_id = auth.uid()
    )
    else (select negocio_operador_peru_id from usuarios where id = auth.uid())
  end;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS: operador_peru_miembro
--   * Dueño (operador_peru) de ese negocio: todo.
--   * El propio miembro: lee y edita SU fila.
--   * Operador de Venezuela asignado a ese miembro: lee y edita su fila
--     (el perfil VE muestra al equipo de Perú con opción a editar).
-- ─────────────────────────────────────────────────────────────
alter table operador_peru_miembro enable row level security;

drop policy if exists "operador_peru_miembro: dueño gestiona" on operador_peru_miembro;
create policy "operador_peru_miembro: dueño gestiona"
  on operador_peru_miembro for all
  using (rol_actual() = 'operador_peru' and operador_peru_id = auth.uid())
  with check (rol_actual() = 'operador_peru' and operador_peru_id = auth.uid());

drop policy if exists "operador_peru_miembro: miembro lee su fila" on operador_peru_miembro;
create policy "operador_peru_miembro: miembro lee su fila"
  on operador_peru_miembro for select
  using (usuario_id = auth.uid());

drop policy if exists "operador_peru_miembro: miembro edita su fila" on operador_peru_miembro;
create policy "operador_peru_miembro: miembro edita su fila"
  on operador_peru_miembro for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists "operador_peru_miembro: VE asignado lee y edita" on operador_peru_miembro;
create policy "operador_peru_miembro: VE asignado lee y edita"
  on operador_peru_miembro for all
  using (operador_venezuela_id in (
    select id from operador_venezuela_perfil where usuario_id = auth.uid()
  ))
  with check (operador_venezuela_id in (
    select id from operador_venezuela_perfil where usuario_id = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────
-- RLS: operador_venezuela_perfil — el VE vinculado también puede editar
-- SU fila (p. ej. su teléfono), no solo leerla. Además, el equipo del
-- negocio (miembros de Perú) lee los perfiles VE para mostrar el VE que
-- les fue asignado.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "operador_venezuela_perfil: el vinculado edita su fila" on operador_venezuela_perfil;
create policy "operador_venezuela_perfil: el vinculado edita su fila"
  on operador_venezuela_perfil for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists "operador_venezuela_perfil: equipo del negocio lee" on operador_venezuela_perfil;
create policy "operador_venezuela_perfil: equipo del negocio lee"
  on operador_venezuela_perfil for select
  using (operador_peru_id = mi_negocio_operador_peru_id());

-- ─────────────────────────────────────────────────────────────
-- RLS: usuarios — el miembro de Perú ve las filas del negocio (clientes,
-- operadores) igual que el dueño y VE.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "usuarios: operadores ven todas las filas" on usuarios;
create policy "usuarios: operadores ven todas las filas"
  on usuarios for select using (
    rol_actual() in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela')
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: invitaciones — el miembro de Perú crea y ve invitaciones de cliente
-- de su negocio (antes solo el dueño podía).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "invitaciones: miembro peru crea y ve invitaciones de su negocio" on invitaciones;
create policy "invitaciones: miembro peru crea y ve invitaciones de su negocio"
  on invitaciones for all
  using (tipo = 'cliente' and negocio_operador_peru_id = mi_negocio_operador_peru_id())
  with check (
    tipo = 'cliente'
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and creado_por = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: solicitudes — el miembro de Perú ve las de su negocio y actualiza
-- las suyas (las ligadas a su operador_peru_miembro_id).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "solicitudes: operadores ven las de su negocio" on solicitudes;
create policy "solicitudes: operadores ven las de su negocio"
  on solicitudes for select using (
    rol_actual() in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela')
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );

drop policy if exists "solicitudes: miembro de peru actualiza las suyas" on solicitudes;
create policy "solicitudes: miembro de peru actualiza las suyas"
  on solicitudes for update
  using (
    rol_actual() = 'operador_peru_miembro'
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and operador_peru_miembro_id = (select id from operador_peru_miembro where usuario_id = auth.uid())
  )
  with check (
    rol_actual() = 'operador_peru_miembro'
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and operador_peru_miembro_id = (select id from operador_peru_miembro where usuario_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- canjear_invitacion: al canjear una invitación de cliente, liga al
-- cliente con el miembro de Perú que lo invitó (si la invitación salió de
-- un miembro).
-- ─────────────────────────────────────────────────────────────
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
begin
  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  if inv.tipo = 'operador_peru' then
    update usuarios set rol = 'operador_peru' where id = auth.uid();
  else
    update usuarios
      set rol = 'cliente',
          negocio_operador_peru_id = inv.negocio_operador_peru_id,
          invitado_por_operador_miembro_id = inv.operador_peru_miembro_id
      where id = auth.uid();
  end if;

  update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;

grant execute on function canjear_invitacion(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPCs de validación: el miembro de Perú valida depósitos de SUS
-- operaciones; el Operador Venezuela valida las de los miembros que le
-- fueron asignados.
-- ─────────────────────────────────────────────────────────────
create or replace function validar_deposito_peru(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro') then
    raise exception 'Solo un Operador de Perú puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_peru = true, check_deposito_peru_at = now()
    where id = p_solicitud_id
      and negocio_operador_peru_id = mi_negocio_operador_peru_id()
      and (
        rol_actual() = 'operador_peru'
        or operador_peru_miembro_id = (select id from operador_peru_miembro where usuario_id = auth.uid())
      );
end;
$$;

grant execute on function validar_deposito_peru(uuid) to authenticated;

-- Sobrecarga antigua (un solo parámetro): se borra para que el create
-- or replace de abajo la reemplace (ver 0015_validar_deposito_ve_comprobante).
drop function if exists validar_deposito_venezuela(uuid);
drop function if exists validar_deposito_venezuela(uuid, text);

create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_url text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_url = coalesce(p_comprobante_url, comprobante_vz_url)
    where id = p_solicitud_id
      and negocio_operador_peru_id = mi_negocio_operador_peru_id()
      and (
        rol_actual() in ('operador_peru', 'operador_peru_miembro')
        or exists (
          select 1 from operador_peru_miembro m
          where m.id = solicitudes.operador_peru_miembro_id
            and m.operador_venezuela_id =
              (select id from operador_venezuela_perfil where usuario_id = auth.uid())
        )
      );
end;
$$;

grant execute on function validar_deposito_venezuela(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- derivar_solicitud: el operador principal deriva una solicitud de sus
-- clientes a un operador de Perú miembro. La operación queda marcada y
-- aparece como "OPERACIÓN DERIVADA" en la sesión del miembro.
-- ─────────────────────────────────────────────────────────────
create or replace function derivar_solicitud(p_solicitud_id uuid, p_operador_peru_miembro_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede derivar solicitudes';
  end if;

  update solicitudes
    set operador_peru_miembro_id = p_operador_peru_miembro_id,
        derivada_de_principal = true
    where id = p_solicitud_id
      and negocio_operador_peru_id = auth.uid();
end;
$$;

grant execute on function derivar_solicitud(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Tasa del día: solo el operador principal (rol operador_peru) publica.
-- Es el RLS ya existente en "tasas: solo Operador Perú publica"; acá se
-- refuerza con un RPC dedicado para que la app lo use de forma explícita
-- desde la pantalla de tasa.
-- ─────────────────────────────────────────────────────────────
create or replace function publicar_tasa_del_dia(p_fecha date, p_tasa_pen_ves numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede publicar la tasa del día';
  end if;

  delete from tasas where fecha = p_fecha and publicada_por = auth.uid();
  insert into tasas (fecha, tasa_pen_ves, publicada_por)
  values (p_fecha, p_tasa_pen_ves, auth.uid());
end;
$$;

grant execute on function publicar_tasa_del_dia(date, numeric) to authenticated;
