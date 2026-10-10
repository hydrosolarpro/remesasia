-- Notificaciones automáticas por Telegram Bot (reemplaza el envío manual de
-- WhatsApp al validar depósitos) + vinculación del Telegram del beneficiario
-- (persona externa sin cuenta en la app) desde el perfil del cliente.
--
-- Requiere, además de esta migración, configurar el secret de la Edge
-- Function (no va en el repo por ser secreto):
--   supabase secrets set TELEGRAM_BOT_TOKEN='<token del bot>'
--   supabase secrets set TELEGRAM_WEBHOOK_SECRET='<valor aleatorio>'
-- y registrar el webhook una vez desplegada `telegram-webhook`:
--   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<edge_function_base_url>/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"

create extension if not exists pgcrypto;

-- El cliente en Perú recibe el mensaje de "depósito validado en Perú".
alter table usuarios add column telegram_chat_id text;
alter table usuarios add column telegram_username text;
alter table usuarios add column telegram_connected boolean not null default false;

-- El beneficiario en Venezuela (sin cuenta en la app) recibe el mensaje de
-- "depósito transferido en Venezuela". Los beneficiarios son las filas de
-- esta tabla (no existe una entidad "beneficiarios" separada).
alter table cuentas_utilizadas_cliente add column telegram_chat_id text;
alter table cuentas_utilizadas_cliente add column telegram_username text;
alter table cuentas_utilizadas_cliente add column telegram_connected boolean not null default false;
alter table cuentas_utilizadas_cliente add column telegram_connected_at timestamptz;

-- Tokens de vinculación de un solo uso, para ambos flujos: el cliente
-- vinculando su propio Telegram (target_type='usuario') y el cliente
-- generando el enlace de invitación para su beneficiario
-- (target_type='beneficiario'). Misma mecánica en ambos casos, así que
-- comparten tabla y el mismo webhook las consume sin duplicar lógica.
create table telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('usuario', 'beneficiario')),
  target_id uuid not null,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Sin policies: no debe ser accesible para 'anon'/'authenticated' vía
-- PostgREST directo. Solo se toca vía las RPC security definer de abajo
-- (inserción) y desde el webhook con service_role (lectura/consumo).
alter table telegram_link_tokens enable row level security;

comment on table telegram_link_tokens is
  'Tokens de un solo uso para vincular telegram_chat_id (propio o de un beneficiario). Consumidos por supabase/functions/telegram-webhook.';

-- Genera el token para que el propio usuario autenticado vincule su
-- Telegram (botón "Conectar Telegram" en el perfil del cliente).
create or replace function generar_token_telegram_propio()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  v_token := encode(gen_random_bytes(20), 'hex');
  insert into telegram_link_tokens (target_type, target_id, token, expires_at)
  values ('usuario', auth.uid(), v_token, now() + interval '15 minutes');
  return v_token;
end;
$$;

-- Genera el token para el enlace que el cliente comparte por WhatsApp con
-- su beneficiario en Venezuela. Valida que el beneficiario le pertenezca.
create or replace function generar_token_telegram_beneficiario(p_beneficiario_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_dueno uuid;
begin
  select cliente_id into v_dueno from cuentas_utilizadas_cliente where id = p_beneficiario_id;
  if v_dueno is null or v_dueno <> auth.uid() then
    raise exception 'No autorizado para vincular este beneficiario';
  end if;

  v_token := encode(gen_random_bytes(20), 'hex');
  insert into telegram_link_tokens (target_type, target_id, token, expires_at)
  values ('beneficiario', p_beneficiario_id, v_token, now() + interval '7 days');
  return v_token;
end;
$$;

-- Dispara la Edge Function `telegram-notificar-deposito` apenas se marca
-- cada check de validación (no espera a que cambie `estado` general, que es
-- lo que escucha el trigger de push FCM en 0005_webhooks.sql -- dominios
-- distintos, por eso va en un trigger separado). Reutiliza los mismos
-- ajustes de base de datos ya configurados para ese trigger:
--   app.settings.edge_function_base_url / app.settings.service_role_key
create function telegram_notificar_deposito() returns trigger as $$
declare
  base_url text := current_setting('app.settings.edge_function_base_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
begin
  if base_url is null then
    return new;
  end if;

  if new.check_deposito_peru and old.check_deposito_peru is distinct from new.check_deposito_peru then
    perform net.http_post(
      url := base_url || '/telegram-notificar-deposito',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
      body := jsonb_build_object('solicitud_id', new.id, 'tipo', 'peru')
    );
  end if;

  if new.check_deposito_ve and old.check_deposito_ve is distinct from new.check_deposito_ve then
    perform net.http_post(
      url := base_url || '/telegram-notificar-deposito',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
      body := jsonb_build_object('solicitud_id', new.id, 'tipo', 'venezuela')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_telegram_notificar_deposito
  after update on solicitudes
  for each row execute function telegram_notificar_deposito();
