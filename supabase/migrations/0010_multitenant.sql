-- Multi-tenant real: cada Operador Perú es un "negocio" independiente con
-- sus propios clientes, operaciones, tasa y cuentas — invitado por el admin
-- (no más SQL manual) y con suscripción mensual verificada antes de operar.

-- ─────────────────────────────────────────────────────────────
-- negocio_operador_peru_id: a qué negocio pertenece cada cliente.
-- ─────────────────────────────────────────────────────────────
alter table usuarios add column negocio_operador_peru_id uuid references usuarios (id);
alter table solicitudes add column negocio_operador_peru_id uuid references usuarios (id);

-- Resuelve "el negocio relevante" sin importar el rol de quien pregunta:
-- Operador Perú -> él mismo; Operador Venezuela -> su operador vinculado;
-- cliente -> el negocio con el que se registró.
create function mi_negocio_operador_peru_id() returns uuid
language sql stable security definer set search_path = public as $$
  select case (select rol from usuarios where id = auth.uid())
    when 'operador_peru' then auth.uid()
    when 'operador_venezuela' then (
      select operador_peru_id from operador_venezuela_perfil where usuario_id = auth.uid()
    )
    else (select negocio_operador_peru_id from usuarios where id = auth.uid())
  end;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS: aislar perfil_negocio / cuentas_bancarias_operador por negocio
-- (antes cualquier autenticado veía los datos bancarios de TODOS los
-- negocios — mal en un sistema con negocios que compiten entre sí).
-- ─────────────────────────────────────────────────────────────
drop policy "perfil_negocio: lectura autenticados" on perfil_negocio;
create policy "perfil_negocio: solo su propio negocio"
  on perfil_negocio for select using (operador_peru_id = mi_negocio_operador_peru_id());

drop policy "cuentas_bancarias_operador: lectura autenticados" on cuentas_bancarias_operador;
create policy "cuentas_bancarias_operador: solo su propio negocio"
  on cuentas_bancarias_operador for select using (operador_peru_id = mi_negocio_operador_peru_id());

-- ─────────────────────────────────────────────────────────────
-- RLS: solicitudes — Operador Perú/Venezuela solo ven las de su negocio.
-- ─────────────────────────────────────────────────────────────
drop policy "solicitudes: operadores ven todas" on solicitudes;
create policy "solicitudes: operadores ven las de su negocio"
  on solicitudes for select using (
    rol_actual() in ('operador_peru', 'operador_venezuela')
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );

drop policy "solicitudes: cliente crea la suya en PENDIENTE" on solicitudes;
create policy "solicitudes: cliente crea la suya en su negocio"
  on solicitudes for insert
  with check (
    cliente_id = auth.uid()
    and estado = 'PENDIENTE'
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );

-- Los RPC de validación ahora exigen que la solicitud pertenezca al
-- negocio del que valida (antes cualquier Operador Perú podía validar
-- la solicitud de otro negocio).
create or replace function validar_deposito_peru(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador Perú puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_peru = true, check_deposito_peru_at = now()
    where id = p_solicitud_id and negocio_operador_peru_id = auth.uid();
end;
$$;

create or replace function validar_deposito_venezuela(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_venezuela') then
    raise exception 'Solo un operador puede validar este depósito';
  end if;

  update solicitudes
    set check_deposito_ve = true, check_deposito_ve_at = now()
    where id = p_solicitud_id and negocio_operador_peru_id = mi_negocio_operador_peru_id();
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- invitaciones — enlaces con token para invitar Operador Perú (desde el
-- admin) o clientes (desde un Operador Perú a su propio negocio).
-- ─────────────────────────────────────────────────────────────
create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  tipo text not null check (tipo in ('operador_peru', 'cliente')),
  negocio_operador_peru_id uuid references usuarios (id), -- solo para tipo='cliente'
  creado_por uuid not null references usuarios (id),
  usado_por uuid references usuarios (id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_invitaciones_token on invitaciones (token);

alter table invitaciones enable row level security;

create policy "invitaciones: admin crea y ve las de operador_peru"
  on invitaciones for all
  using (tipo = 'operador_peru' and rol_actual() = 'administrador')
  with check (tipo = 'operador_peru' and rol_actual() = 'administrador' and creado_por = auth.uid());

create policy "invitaciones: operador_peru crea y ve las de su negocio"
  on invitaciones for all
  using (tipo = 'cliente' and negocio_operador_peru_id = auth.uid())
  with check (tipo = 'cliente' and negocio_operador_peru_id = auth.uid() and creado_por = auth.uid());

-- Canjea una invitación ya autenticado (el login con Google ocurre antes;
-- el token viaja guardado en el dispositivo, ver lib/invitaciones.ts).
-- security definer: quien canjea no tiene (ni debe tener) acceso de
-- lectura general a la tabla invitaciones.
create function canjear_invitacion(p_token text) returns jsonb
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
      set rol = 'cliente', negocio_operador_peru_id = inv.negocio_operador_peru_id
      where id = auth.uid();
  end if;

  update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;

grant execute on function canjear_invitacion(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Suscripción mensual del Operador Perú (S/50/mes) verificada por el admin.
-- ─────────────────────────────────────────────────────────────
create table pagos_suscripcion (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null references usuarios (id) on delete cascade,
  periodo text not null, -- 'YYYY-MM'
  monto numeric(8, 2) not null default 50,
  comprobante_url text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'verificado', 'rechazado')),
  motivo_rechazo text,
  verificado_por uuid references usuarios (id),
  verificado_at timestamptz,
  created_at timestamptz not null default now(),
  unique (operador_peru_id, periodo)
);

alter table pagos_suscripcion enable row level security;

create policy "pagos_suscripcion: operador_peru ve y crea los suyos"
  on pagos_suscripcion for select using (operador_peru_id = auth.uid());

create policy "pagos_suscripcion: operador_peru sube su comprobante"
  on pagos_suscripcion for insert with check (operador_peru_id = auth.uid());

create policy "pagos_suscripcion: admin ve todos"
  on pagos_suscripcion for select using (rol_actual() = 'administrador');

create policy "pagos_suscripcion: admin aprueba o rechaza"
  on pagos_suscripcion for update using (rol_actual() = 'administrador');

-- Config de pagos del admin (fila única) — a dónde debe pagar el Operador
-- Perú su suscripción.
create table configuracion_pagos_admin (
  id uuid primary key default gen_random_uuid(),
  banco text,
  cuenta_soles text,
  cci text,
  titular text,
  yape_qr_url text,
  plin_qr_url text,
  monto_suscripcion numeric(8, 2) not null default 50,
  updated_at timestamptz not null default now()
);

create trigger trg_configuracion_pagos_admin_updated_at
  before update on configuracion_pagos_admin
  for each row execute function set_updated_at();

alter table configuracion_pagos_admin enable row level security;

create policy "configuracion_pagos_admin: lectura autenticados"
  on configuracion_pagos_admin for select using (auth.role() = 'authenticated');

create policy "configuracion_pagos_admin: solo admin edita"
  on configuracion_pagos_admin for all
  using (rol_actual() = 'administrador')
  with check (rol_actual() = 'administrador');

insert into configuracion_pagos_admin (banco, cuenta_soles, cci, titular, monto_suscripcion)
values ('BCP', '1949-8905-2050-45', '00-2194-1989-05205-04590', 'JOSE ALFREDO SILVA CASTILLO', 50);
