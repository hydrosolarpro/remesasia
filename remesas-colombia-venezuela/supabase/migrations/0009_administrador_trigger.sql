-- Promueve la cuenta admin fija si ya existía, y hace que handle_new_user
-- la asigne automáticamente al rol administrador desde ahora en adelante.
update usuarios set rol = 'administrador' where email = 'productosaas2026@gmail.com';

create or replace function handle_new_user() returns trigger as $$
declare
  ve_perfil_id uuid;
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

  return new;
end;
$$ language plpgsql security definer set search_path = public;
