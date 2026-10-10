-- Rediseño: auth por Gmail (usuarios.email reemplaza a telefono como identidad),
-- perfil de negocio del Operador Perú, cuentas bancarias/QR, vínculo con el
-- Operador Venezuela por email, cuentas de beneficiario reutilizables del
-- cliente, caché de tasa BCV, y doble check de validación de depósito.

-- ─────────────────────────────────────────────────────────────
-- usuarios: el teléfono ya no viene de Auth (Google no lo provee),
-- se completa luego desde los formularios de perfil/registro.
-- ─────────────────────────────────────────────────────────────
alter table usuarios alter column telefono drop not null;
alter table usuarios alter column telefono drop default;
alter table usuarios add column email text;
alter table usuarios add column pais text;
create unique index usuarios_email_key on usuarios (email) where email is not null;

-- ─────────────────────────────────────────────────────────────
-- perfil_negocio (1:1 con el Operador Perú)
-- ─────────────────────────────────────────────────────────────
create table perfil_negocio (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null unique references usuarios (id) on delete cascade,
  nombre_negocio text not null default '',
  logo_url text,
  eslogan text not null default '',
  rentabilidad_pct numeric(6, 3) not null default 0 check (rentabilidad_pct >= 0),
  yape_qr_url text,
  plin_qr_url text,
  es_operador_venezuela_mismo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_perfil_negocio_updated_at
  before update on perfil_negocio
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- cuentas_bancarias_operador — N cuentas por Operador Perú
-- ─────────────────────────────────────────────────────────────
create table cuentas_bancarias_operador (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null references usuarios (id) on delete cascade,
  entidad text not null,
  numero_cuenta text not null,
  created_at timestamptz not null default now()
);

create index idx_cuentas_bancarias_operador on cuentas_bancarias_operador (operador_peru_id);

-- ─────────────────────────────────────────────────────────────
-- operador_venezuela_perfil — datos del operador VE cargados por el
-- Operador Perú en su onboarding. `usuario_id` se completa solo cuando
-- esa persona inicia sesión por primera vez con ese mismo email
-- (ver handle_new_user más abajo). Si `perfil_negocio.es_operador_venezuela_mismo`
-- es true, no hace falta fila aquí.
-- ─────────────────────────────────────────────────────────────
create table operador_venezuela_perfil (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null unique references usuarios (id) on delete cascade,
  nombre text not null default '',
  telefono text,
  email text,
  usuario_id uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_operador_venezuela_perfil_updated_at
  before update on operador_venezuela_perfil
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- cuentas_utilizadas_cliente — beneficiarios guardados por el cliente,
-- reutilizables entre solicitudes (autocompletado).
-- ─────────────────────────────────────────────────────────────
create table cuentas_utilizadas_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios (id) on delete cascade,
  nombre_beneficiario text not null,
  telefono text,
  ci text not null,
  entidad_bancaria text not null,
  numero_cuenta text not null,
  created_at timestamptz not null default now(),
  unique (cliente_id, ci, numero_cuenta)
);

create index idx_cuentas_utilizadas_cliente on cuentas_utilizadas_cliente (cliente_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- tasa_bcv — caché de la tasa oficial (USD/EUR a VES) de bcv.org.ve,
-- poblada por la Edge Function `bcv-tasa` bajo demanda.
-- ─────────────────────────────────────────────────────────────
create table tasa_bcv (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  usd_ves numeric(14, 4) not null check (usd_ves > 0),
  eur_ves numeric(14, 4) not null check (eur_ves > 0),
  fetched_at timestamptz not null default now()
);

create index idx_tasa_bcv_fetched on tasa_bcv (fetched_at desc);

alter table tasa_bcv enable row level security;

create policy "tasa_bcv: lectura para autenticados"
  on tasa_bcv for select using (auth.role() = 'authenticated');

-- Sin policy de insert/update: solo la Edge Function con service_role escribe.

-- ─────────────────────────────────────────────────────────────
-- solicitudes: CI del beneficiario + doble check de validación de depósito
-- (reemplaza la validación manual de estado por un flujo de 2 checks).
-- ─────────────────────────────────────────────────────────────
alter table solicitudes add column beneficiario_ci text;
alter table solicitudes add column check_deposito_peru boolean not null default false;
alter table solicitudes add column check_deposito_peru_at timestamptz;
alter table solicitudes add column check_deposito_ve boolean not null default false;
alter table solicitudes add column check_deposito_ve_at timestamptz;

-- ─────────────────────────────────────────────────────────────
-- RPCs para marcar cada check. Evitan exponer UPDATE genérico de
-- `solicitudes` al Operador Venezuela (que solo debe poder tocar su
-- propia columna de validación).
-- ─────────────────────────────────────────────────────────────
create function validar_deposito_peru(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador Perú puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_peru = true, check_deposito_peru_at = now()
    where id = p_solicitud_id;
end;
$$;

create function validar_deposito_venezuela(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_ve = true, check_deposito_ve_at = now()
    where id = p_solicitud_id;
end;
$$;

grant execute on function validar_deposito_peru(uuid) to authenticated;
grant execute on function validar_deposito_venezuela(uuid) to authenticated;

-- El Operador Venezuela ya no debe poder actualizar `solicitudes` en
-- general (solo vía la RPC de arriba). El Operador Perú conserva su
-- policy amplia de update (edita CI, rechaza, ajusta tasa real, etc).
drop policy "solicitudes: Operador Venezuela actualiza cualquiera" on solicitudes;

-- Sincroniza `estado` (usado por la vista operaciones_dashboard) con
-- los nuevos checks, sin romper la máquina de estados existente.
create function sincronizar_estado_por_checks() returns trigger as $$
begin
  if new.check_deposito_ve and not old.check_deposito_ve then
    if new.estado not in ('COMPLETADA', 'CANCELADA', 'RECHAZADA') then
      new.estado := 'COMPLETADA';
    end if;
  elsif new.check_deposito_peru and not old.check_deposito_peru then
    if new.estado = 'PENDIENTE' then
      new.estado := 'FONDOS_VERIFICADOS';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_sincronizar_estado_por_checks
  before update on solicitudes
  for each row
  when (new.check_deposito_peru is distinct from old.check_deposito_peru
        or new.check_deposito_ve is distinct from old.check_deposito_ve)
  execute function sincronizar_estado_por_checks();

-- ─────────────────────────────────────────────────────────────
-- handle_new_user: ahora usa email (Google) en vez de teléfono, y
-- vincula automáticamente al Operador Venezuela cuando su email
-- coincide con el que cargó el Operador Perú en su onboarding.
-- El Operador Perú (dueño del negocio) se sigue promoviendo a mano,
-- una única vez, igual que antes — ver README.
-- ─────────────────────────────────────────────────────────────
create or replace function handle_new_user() returns trigger as $$
declare
  ve_perfil_id uuid;
  rol_asignado rol := 'cliente';
begin
  select id into ve_perfil_id
    from operador_venezuela_perfil
    where email = new.email and usuario_id is null
    limit 1;

  if ve_perfil_id is not null then
    rol_asignado := 'operador_venezuela';
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

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────
-- RLS de las tablas nuevas
-- ─────────────────────────────────────────────────────────────
alter table perfil_negocio enable row level security;
alter table cuentas_bancarias_operador enable row level security;
alter table operador_venezuela_perfil enable row level security;
alter table cuentas_utilizadas_cliente enable row level security;

-- perfil_negocio y cuentas_bancarias_operador: lectura abierta a
-- autenticados (el cliente necesita ver nombre del negocio, eslogan,
-- QR y cuentas para pagar), escritura solo del dueño.
create policy "perfil_negocio: lectura autenticados"
  on perfil_negocio for select using (auth.role() = 'authenticated');

create policy "perfil_negocio: dueño gestiona"
  on perfil_negocio for all
  using (operador_peru_id = auth.uid())
  with check (operador_peru_id = auth.uid());

create policy "cuentas_bancarias_operador: lectura autenticados"
  on cuentas_bancarias_operador for select using (auth.role() = 'authenticated');

create policy "cuentas_bancarias_operador: dueño gestiona"
  on cuentas_bancarias_operador for all
  using (operador_peru_id = auth.uid())
  with check (operador_peru_id = auth.uid());

-- operador_venezuela_perfil: solo el dueño (Operador Perú) y la
-- persona ya vinculada pueden verlo/gestionarlo.
create policy "operador_venezuela_perfil: dueño gestiona"
  on operador_venezuela_perfil for all
  using (operador_peru_id = auth.uid())
  with check (operador_peru_id = auth.uid());

create policy "operador_venezuela_perfil: el vinculado se lee a sí mismo"
  on operador_venezuela_perfil for select using (usuario_id = auth.uid());

-- cuentas_utilizadas_cliente: privado por cliente.
create policy "cuentas_utilizadas_cliente: dueño gestiona"
  on cuentas_utilizadas_cliente for all
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());

-- usuarios: cualquier autenticado puede ver el nombre de los
-- operadores (el cliente necesita saber con quién trata).
create policy "usuarios: cualquiera ve datos básicos de operadores"
  on usuarios for select using (rol in ('operador_peru', 'operador_venezuela'));
