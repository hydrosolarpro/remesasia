-- Suscripciones Web Push (PWA): permiten avisar al operador con sonido y
-- notificación flotante aunque tenga la app/pestaña cerrada. Las lee solo el
-- servidor (Edge Functions con service_role); el cliente las gestiona por RPC.

create table if not exists push_web_suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_web_usuario on push_web_suscripciones (usuario_id);

alter table push_web_suscripciones enable row level security;
-- Sin policies a propósito: nadie accede directo desde el cliente.

-- Registra (o reasigna al usuario actual) la suscripción de este navegador.
-- Si el mismo navegador cambió de cuenta, el endpoint pasa a la cuenta nueva.
create or replace function registrar_push_web(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  insert into push_web_suscripciones (usuario_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

create or replace function quitar_push_web(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from push_web_suscripciones where endpoint = p_endpoint and usuario_id = auth.uid();
$$;

revoke all on function registrar_push_web(text, text, text) from public, anon;
revoke all on function quitar_push_web(text) from public, anon;
grant execute on function registrar_push_web(text, text, text) to authenticated;
grant execute on function quitar_push_web(text) to authenticated;
