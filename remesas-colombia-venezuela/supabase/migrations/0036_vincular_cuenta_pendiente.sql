-- handle_new_user() solo vincula por email al Operador Perú/Venezuela en el
-- momento en que la cuenta de Supabase Auth se crea por primera vez. Esta
-- función repite esa vinculación en dos casos que el trigger no cubre:
--   1) La persona ya tenía cuenta como 'cliente' antes de que el Operador
--      Perú cargara su correo (nunca se revisaba de nuevo).
--   2) La persona ya tenía el rol correcto pero su fila de vínculo se borró
--      (p.ej. al eliminarla desde Perfil) y se volvió a registrar: como el
--      rol no vuelve a 'cliente', el caso 1 no la alcanzaba y quedaba
--      huérfana viendo "tu cuenta no está vinculada a ningún negocio".
create or replace function vincular_cuenta_pendiente() returns rol
language plpgsql security definer set search_path = public as $$
declare
  mi_email text;
  mi_rol rol;
  ve_perfil_id uuid;
  pe_miembro_id uuid;
begin
  select email, rol into mi_email, mi_rol from usuarios where id = auth.uid();

  if mi_rol is null or mi_email is null then
    return mi_rol;
  end if;

  if mi_rol = 'cliente'
     or (mi_rol = 'operador_venezuela' and not exists (select 1 from operador_venezuela_perfil where usuario_id = auth.uid()))
  then
    select id into ve_perfil_id
      from operador_venezuela_perfil
      where email = mi_email and usuario_id is null
      limit 1;

    if ve_perfil_id is not null then
      update operador_venezuela_perfil set usuario_id = auth.uid() where id = ve_perfil_id;
      update usuarios set rol = 'operador_venezuela' where id = auth.uid();
      return 'operador_venezuela';
    end if;
  end if;

  if mi_rol = 'cliente'
     or (mi_rol = 'operador_peru_miembro' and not exists (select 1 from operador_peru_miembro where usuario_id = auth.uid()))
  then
    select id into pe_miembro_id
      from operador_peru_miembro
      where email = mi_email and usuario_id is null
      limit 1;

    if pe_miembro_id is not null then
      update operador_peru_miembro set usuario_id = auth.uid() where id = pe_miembro_id;
      update usuarios set rol = 'operador_peru_miembro' where id = auth.uid();
      return 'operador_peru_miembro';
    end if;
  end if;

  return mi_rol;
end;
$$;

grant execute on function vincular_cuenta_pendiente() to authenticated;
