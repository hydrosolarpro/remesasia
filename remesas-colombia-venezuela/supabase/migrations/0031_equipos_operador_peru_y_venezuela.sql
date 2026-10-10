-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.
-- (operador_peru_miembro se vuelve a declarar más tarde con `if not
-- exists` en 0051_equipos_operadores.sql -- eso es un no-op sobre lo que
-- esta migración ya crea.)

-- Permite varios miembros de Operador Venezuela por negocio (antes era
-- uno solo por la restricción UNIQUE(operador_peru_id)).
alter table operador_venezuela_perfil drop constraint if exists operador_venezuela_perfil_operador_peru_id_key;
alter table operador_venezuela_perfil drop constraint if exists operador_venezuela_perfil_operador_peru_id_email_key;
alter table operador_venezuela_perfil add constraint operador_venezuela_perfil_operador_peru_id_email_key unique (operador_peru_id, email);

-- Miembros del equipo del Operador Perú principal: personas que
-- acompañan al operador dueño de la cuenta, con acceso operativo (validar
-- depósitos, publicar tasa) pero sin poder gestionar el equipo ni la
-- suscripción. Se vinculan solos por correo, igual que Operador Venezuela.
create table if not exists operador_peru_miembro (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null references usuarios(id) on delete cascade,
  nombre text not null,
  telefono text,
  email text not null,
  usuario_id uuid unique references usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operador_peru_id, email)
);
alter table operador_peru_miembro enable row level security;

drop policy if exists "operador_peru_miembro: el dueño del negocio gestiona" on operador_peru_miembro;
create policy "operador_peru_miembro: el dueño del negocio gestiona"
  on operador_peru_miembro for all
  using (operador_peru_id = auth.uid() and rol_actual() = 'operador_peru')
  with check (operador_peru_id = auth.uid() and rol_actual() = 'operador_peru');

drop policy if exists "operador_peru_miembro: el negocio entero puede ver el equipo" on operador_peru_miembro;
create policy "operador_peru_miembro: el negocio entero puede ver el equipo"
  on operador_peru_miembro for select
  using (operador_peru_id = mi_negocio_operador_peru_id());

drop policy if exists "operador_peru_miembro: el vinculado se lee a sí mismo" on operador_peru_miembro;
create policy "operador_peru_miembro: el vinculado se lee a sí mismo"
  on operador_peru_miembro for select
  using (usuario_id = auth.uid());

-- Toggle independiente del que ya existe para Operador Venezuela: la
-- rentabilidad es sensible y el dueño decide si la ven sus propios
-- miembros de equipo en Perú.
alter table perfil_negocio add column if not exists compartir_rentabilidad_pe_miembros boolean not null default false;

-- Atribución: quién validó cada check, para mostrarlo en las listas de
-- operaciones y desglosarlo en estadísticas.
alter table solicitudes add column if not exists validado_peru_por uuid references usuarios(id);
alter table solicitudes add column if not exists validado_ve_por uuid references usuarios(id);

-- El trigger de alta de usuario ahora también reconoce correos
-- registrados como miembro de equipo del Operador Perú (antes solo
-- reconocía al admin bootstrap y a Operador Venezuela).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ve_perfil_id uuid;
  pe_miembro_id uuid;
  rol_asignado rol := 'cliente';
begin
  if new.email = 'productosaas2026@gmail.com' then
    rol_asignado := 'administrador';
  else
    select id into ve_perfil_id
      from operador_venezuela_perfil
      where email = new.email and usuario_id is null
      limit 1;

    if ve_perfil_id is not null then
      rol_asignado := 'operador_venezuela';
    else
      select id into pe_miembro_id
        from operador_peru_miembro
        where email = new.email and usuario_id is null
        limit 1;

      if pe_miembro_id is not null then
        rol_asignado := 'operador_peru_miembro';
      end if;
    end if;
  end if;

  insert into public.usuarios (id, telefono, nombre, email, rol)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email, 'Nuevo usuario'),
    new.email,
    rol_asignado
  );

  if ve_perfil_id is not null then
    update operador_venezuela_perfil set usuario_id = new.id where id = ve_perfil_id;
  end if;

  if pe_miembro_id is not null then
    update operador_peru_miembro set usuario_id = new.id where id = pe_miembro_id;
  end if;

  return new;
end;
$$;

-- mi_negocio_operador_peru_id(): los miembros de equipo del Operador Perú
-- resuelven al negocio del dueño (no al suyo propio, que no existe).
create or replace function mi_negocio_operador_peru_id() returns uuid
language sql security definer set search_path = public stable as $$
  select case (select rol from usuarios where id = auth.uid())
    when 'operador_peru' then auth.uid()
    when 'operador_peru_miembro' then (
      select operador_peru_id from operador_peru_miembro where usuario_id = auth.uid()
    )
    when 'operador_venezuela' then (
      select operador_peru_id from operador_venezuela_perfil where usuario_id = auth.uid()
    )
    else (select negocio_operador_peru_id from usuarios where id = auth.uid())
  end;
$$;

-- Los miembros de equipo de Perú pueden validar ambos checks y publicar
-- tasa, igual que el dueño (les falta solo la gestión del equipo y la
-- suscripción, ya cubierta por las políticas de arriba).
create or replace function validar_deposito_peru(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro') then
    raise exception 'Solo el Operador Perú puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_peru = true, check_deposito_peru_at = now(), validado_peru_por = auth.uid()
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

create or replace function validar_deposito_venezuela(p_solicitud_id uuid, p_comprobante_url text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_ve = true,
        check_deposito_ve_at = now(),
        comprobante_vz_url = coalesce(p_comprobante_url, comprobante_vz_url),
        validado_ve_por = auth.uid()
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

-- RLS: dondequiera que 'operador_peru' tenía acceso operativo (ver/validar
-- solicitudes, publicar tasa), 'operador_peru_miembro' obtiene el mismo
-- acceso — ya scopeado por negocio a través de mi_negocio_operador_peru_id().
drop policy if exists "solicitudes: operadores ven las de su negocio" on solicitudes;
create policy "solicitudes: operadores ven las de su negocio"
  on solicitudes for select
  using (
    rol_actual() = ANY (ARRAY['operador_peru'::rol, 'operador_peru_miembro'::rol, 'operador_venezuela'::rol])
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );

drop policy if exists "solicitudes: Operador Perú actualiza las de su negocio" on solicitudes;
create policy "solicitudes: Operador Perú actualiza las de su negocio"
  on solicitudes for update
  using (
    rol_actual() = ANY (ARRAY['operador_peru'::rol, 'operador_peru_miembro'::rol])
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  )
  with check (
    rol_actual() = ANY (ARRAY['operador_peru'::rol, 'operador_peru_miembro'::rol])
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );

drop policy if exists "tasas: solo Operador Perú publica" on tasas;
create policy "tasas: solo Operador Perú publica"
  on tasas for insert
  with check (rol_actual() = ANY (ARRAY['operador_peru'::rol, 'operador_peru_miembro'::rol]));
