-- ─────────────────────────────────────────────────────────────
-- 0052 — Fix vinculación de operadores (PE Miembro y VE).
--
-- Actualiza handle_new_user() para que detecte automáticamente el rol de
-- los nuevos operadores de Perú (miembros) y Venezuela cuando inician
-- sesión por primera vez con Google, vinculando su auth.uid() al perfil
-- pre-cargado por el Operador Principal.
-- ─────────────────────────────────────────────────────────────

create or replace function handle_new_user() returns trigger as $$
declare
  ve_perfil_id uuid;
  pe_miembro_id uuid;
  rol_asignado rol := 'cliente';
begin
  -- 1. Administrador fijo
  if new.email = 'productosaas2026@gmail.com' then
    rol_asignado := 'administrador';
  else
    -- 2. ¿Es un Operador de Venezuela pre-registrado?
    select id into ve_perfil_id
      from operador_venezuela_perfil
      where email = new.email and usuario_id is null
      limit 1;

    if ve_perfil_id is not null then
      rol_asignado := 'operador_venezuela';
    else
      -- 3. ¿Es un miembro del equipo de Perú pre-registrado?
      select id into pe_miembro_id
        from operador_peru_miembro
        where email = new.email and usuario_id is null
        limit 1;

      if pe_miembro_id is not null then
        rol_asignado := 'operador_peru_miembro';
      end if;
    end if;
  end if;

  -- Crear el perfil de usuario público
  insert into public.usuarios (id, telefono, nombre, email, rol)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email, 'Nuevo usuario'),
    new.email,
    rol_asignado
  );

  -- Vincular la fila de perfil/miembro al usuario recién creado
  if ve_perfil_id is not null then
    update operador_venezuela_perfil set usuario_id = new.id where id = ve_perfil_id;
  end if;
  
  if pe_miembro_id is not null then
    update operador_peru_miembro set usuario_id = new.id where id = pe_miembro_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
