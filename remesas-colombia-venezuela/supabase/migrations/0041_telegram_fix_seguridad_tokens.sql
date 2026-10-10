-- Corrige un hueco de seguridad detectado por el linter (get_advisors) en
-- 0040_telegram_notificaciones.sql: con auth.uid() nulo (llamada anónima),
-- `v_dueno <> auth.uid()` evalúa a NULL, y `if NULL then` no dispara la
-- excepción en PL/pgSQL -- un caller sin sesión podía generar un token de
-- vinculación para cualquier beneficiario. Se exige explícitamente que
-- auth.uid() no sea nulo. También se agrega `set search_path = public` a
-- telegram_notificar_deposito() (WARN function_search_path_mutable).

create or replace function generar_token_telegram_propio()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  v_token := encode(gen_random_bytes(20), 'hex');
  insert into telegram_link_tokens (target_type, target_id, token, expires_at)
  values ('usuario', auth.uid(), v_token, now() + interval '15 minutes');
  return v_token;
end;
$$;

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
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

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

create or replace function telegram_notificar_deposito() returns trigger as $$
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
$$ language plpgsql security definer set search_path = public;
