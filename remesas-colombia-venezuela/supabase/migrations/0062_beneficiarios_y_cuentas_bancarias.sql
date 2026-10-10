-- ─────────────────────────────────────────────────────────────
-- Fase C — Un beneficiario puede tener varias cuentas bancarias. Antes,
-- cuentas_utilizadas_cliente era 1 fila = 1 beneficiario CON exactamente 1
-- cuenta (unique cliente_id,ci,numero_cuenta). Se separa en 2 tablas:
-- beneficiarios_cliente (persona, incluye Telegram) y
-- beneficiario_cuentas_bancarias (N cuentas por beneficiario).
--
-- cuentas_utilizadas_cliente NO se borra en esta fase -- queda como
-- respaldo hasta confirmar que todo funciona en producción.
-- ─────────────────────────────────────────────────────────────
create table if not exists beneficiarios_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references usuarios (id) on delete cascade,
  nombre text not null,
  ci text not null,
  telegram_chat_id text,
  telegram_username text,
  telegram_connected boolean not null default false,
  telegram_connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cliente_id, ci)
);
alter table beneficiarios_cliente enable row level security;
drop policy if exists "beneficiarios_cliente: dueño gestiona" on beneficiarios_cliente;
create policy "beneficiarios_cliente: dueño gestiona"
  on beneficiarios_cliente for all
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());
create index if not exists idx_beneficiarios_cliente on beneficiarios_cliente (cliente_id, created_at desc);

create table if not exists beneficiario_cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  beneficiario_id uuid not null references beneficiarios_cliente (id) on delete cascade,
  entidad_bancaria text not null,
  numero_cuenta text not null,
  telefono text,
  created_at timestamptz not null default now(),
  unique (beneficiario_id, entidad_bancaria, numero_cuenta)
);
alter table beneficiario_cuentas_bancarias enable row level security;
drop policy if exists "beneficiario_cuentas_bancarias: dueño gestiona" on beneficiario_cuentas_bancarias;
create policy "beneficiario_cuentas_bancarias: dueño gestiona"
  on beneficiario_cuentas_bancarias for all
  using (beneficiario_id in (select id from beneficiarios_cliente where cliente_id = auth.uid()))
  with check (beneficiario_id in (select id from beneficiarios_cliente where cliente_id = auth.uid()));
create index if not exists idx_beneficiario_cuentas_beneficiario on beneficiario_cuentas_bancarias (beneficiario_id);

-- Migración de datos: cada (cliente_id, ci) se convierte en 1
-- beneficiario; cada fila original se convierte en 1 cuenta bancaria de
-- ese beneficiario. Telegram (de la persona, no de la cuenta) se toma de
-- la fila ya conectada si existe, si no de la más antigua.
insert into beneficiarios_cliente (cliente_id, nombre, ci, telegram_chat_id, telegram_username, telegram_connected, telegram_connected_at, created_at)
select distinct on (cliente_id, ci)
  cliente_id, nombre_beneficiario, ci, telegram_chat_id, telegram_username, telegram_connected, telegram_connected_at, created_at
from cuentas_utilizadas_cliente
order by cliente_id, ci, telegram_connected desc, created_at asc
on conflict (cliente_id, ci) do nothing;

insert into beneficiario_cuentas_bancarias (beneficiario_id, entidad_bancaria, numero_cuenta, telefono, created_at)
select b.id, c.entidad_bancaria, c.numero_cuenta, c.telefono, c.created_at
from cuentas_utilizadas_cliente c
join beneficiarios_cliente b on b.cliente_id = c.cliente_id and b.ci = c.ci
on conflict (beneficiario_id, entidad_bancaria, numero_cuenta) do nothing;

-- generar_token_telegram_beneficiario ahora valida dueño contra
-- beneficiarios_cliente (persona) en vez de cuentas_utilizadas_cliente.
create or replace function generar_token_telegram_beneficiario(p_beneficiario_id uuid) returns text
language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare
  v_token text;
  v_dueno uuid;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  select cliente_id into v_dueno from beneficiarios_cliente where id = p_beneficiario_id;
  if v_dueno is null or v_dueno <> auth.uid() then
    raise exception 'No autorizado para vincular este beneficiario';
  end if;

  v_token := encode(gen_random_bytes(20), 'hex');
  insert into telegram_link_tokens (target_type, target_id, token, expires_at)
  values ('beneficiario', p_beneficiario_id, v_token, now() + interval '7 days');
  return v_token;
end;
$$;
