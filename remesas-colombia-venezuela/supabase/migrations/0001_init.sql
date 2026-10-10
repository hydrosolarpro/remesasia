-- Remesas IA — esquema inicial
-- Roles, tasas, solicitudes (máquina de estados), chat interno.

create extension if not exists "pgcrypto";

create type rol as enum ('cliente', 'operador_peru', 'operador_venezuela');

create type estado_solicitud as enum (
  'BORRADOR',
  'PENDIENTE',
  'EN_VERIFICACION',
  'FONDOS_VERIFICADOS',
  'EN_PROCESO',
  'COMPLETADA',
  'RECHAZADA',
  'CANCELADA'
);

create type metodo_pago as enum ('yape', 'banco');

-- ─────────────────────────────────────────────────────────────
-- usuarios (1:1 con auth.users)
-- ─────────────────────────────────────────────────────────────
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  telefono text not null,
  nombre text not null default '',
  rol rol not null default 'cliente',
  push_token text,
  created_at timestamptz not null default now()
);

-- Alta automática: toda cuenta nueva entra como 'cliente'.
-- El Operador Perú promueve manualmente a operador_peru/operador_venezuela
-- (2-3 cuentas internas, cambio directo en el dashboard de Supabase o vía SQL).
create function handle_new_user() returns trigger as $$
begin
  insert into public.usuarios (id, telefono, nombre)
  values (new.id, coalesce(new.phone, ''), coalesce(new.phone, 'Nuevo usuario'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- tasas (F1 — publicada diariamente por Operador Perú)
-- ─────────────────────────────────────────────────────────────
create table tasas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tasa_pen_usdt numeric(10, 4) not null check (tasa_pen_usdt > 0),
  tasa_usdt_ves numeric(10, 4) not null check (tasa_usdt_ves > 0),
  publicada_por uuid not null references usuarios (id),
  created_at timestamptz not null default now()
);

create index idx_tasas_fecha on tasas (fecha desc, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- solicitudes (núcleo del ciclo de vida de una remesa)
-- ─────────────────────────────────────────────────────────────
create table solicitudes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios (id),
  operador_peru_id uuid references usuarios (id),
  operador_venezuela_id uuid references usuarios (id),
  estado estado_solicitud not null default 'PENDIENTE',

  monto_pen numeric(10, 2) not null check (monto_pen > 0),
  tasa_pen_usdt numeric(10, 4) not null,
  tasa_usdt_ves numeric(10, 4) not null,
  monto_usdt numeric(14, 4) not null,
  monto_ves numeric(14, 2) not null,

  beneficiario_nombre text not null,
  beneficiario_banco text not null,
  beneficiario_cuenta text not null,

  metodo_pago metodo_pago not null,
  comprobante_pago_url text,
  motivo_rechazo text,

  tasa_real_compra numeric(10, 4),
  comprobante_vz_url text,
  comprobante_pdf_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_solicitudes_cliente on solicitudes (cliente_id, created_at desc);
create index idx_solicitudes_estado on solicitudes (estado, created_at desc);
create index idx_solicitudes_created_at on solicitudes (created_at);

-- ─────────────────────────────────────────────────────────────
-- mensajes_chat (F13 — chat interno Op. Perú ↔ Op. Venezuela)
-- ─────────────────────────────────────────────────────────────
create table mensajes_chat (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references solicitudes (id) on delete cascade,
  autor_id uuid not null references usuarios (id),
  autor_rol rol not null,
  mensaje text not null,
  created_at timestamptz not null default now()
);

create index idx_mensajes_chat_solicitud on mensajes_chat (solicitud_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- Realtime (F: sincronización en tiempo real entre actores)
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table solicitudes;
alter publication supabase_realtime add table mensajes_chat;
