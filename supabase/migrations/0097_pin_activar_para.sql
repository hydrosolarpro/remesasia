-- El operador principal / admin le activa el acceso con PIN a un usuario
-- de su negocio que YA existe (ya entró con Google alguna vez) pero
-- todavía no tiene PIN. Crea (o reemplaza) la fila con un PIN temporal;
-- el usuario define el definitivo en su primer ingreso con PIN.
-- Para usuarios que NUNCA iniciaron sesión, ver pin_provisionar.
create or replace function pin_activar_para(p_usuario_id uuid, p_telefono text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_tel text; v_pin text;
begin
  if not puede_gestionar_pin(p_usuario_id) then
    raise exception 'No autorizado para activar el PIN de este usuario.';
  end if;
  if not exists (select 1 from usuarios where id = p_usuario_id) then
    raise exception 'Ese usuario todavía no tiene cuenta. Usa "Activar con PIN" para provisionarlo.';
  end if;

  v_tel := normalizar_telefono_e164(p_telefono);
  if v_tel is null then raise exception 'Teléfono inválido. Escríbelo con el código de país.'; end if;
  if exists (select 1 from acceso_pin where telefono_e164 = v_tel and usuario_id is distinct from p_usuario_id) then
    raise exception 'Ese teléfono ya tiene un acceso con PIN en otra cuenta.';
  end if;

  v_pin := lpad((floor(random() * 10000))::int::text, 4, '0');
  delete from acceso_pin where usuario_id = p_usuario_id;
  insert into acceso_pin (usuario_id, telefono_e164, pin_hash, pin_temporal, creado_por)
  values (p_usuario_id, v_tel, crypt(v_pin, gen_salt('bf')), true, auth.uid());

  update usuarios set telefono = coalesce(nullif(trim(telefono), ''), v_tel) where id = p_usuario_id;
  return jsonb_build_object('ok', true, 'pin', v_pin, 'telefono', v_tel);
end;
$$;
revoke execute on function pin_activar_para(uuid, text) from public;
grant execute on function pin_activar_para(uuid, text) to authenticated;
