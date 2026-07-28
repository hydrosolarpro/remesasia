-- 0041 fijó `search_path = public` para cerrar el warning del linter
-- (function_search_path_mutable), pero eso rompió gen_random_bytes(): en
-- proyectos Supabase, pgcrypto vive en el esquema `extensions`, no en
-- `public`. Error real visto en logs: "function gen_random_bytes(integer)
-- does not exist". Se agrega `extensions` al search_path sin perder el
-- hardening (sigue sin incluir "$user" ni esquemas mutables por el rol).

create or replace function generar_token_telegram_propio()
returns text
language plpgsql
security definer
set search_path = public, extensions
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
set search_path = public, extensions
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
