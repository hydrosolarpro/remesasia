-- Estado del PIN de la PROPIA cuenta (cualquier rol) -- para que la app,
-- al arrancar, sepa si hay que forzar el cambio de un PIN temporal
-- (recuperación). `pin_estado_usuario` no sirve para esto porque exige
-- ser operador/admin del usuario consultado.
create or replace function mi_pin_estado() returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select jsonb_build_object('tiene_pin', true, 'pin_temporal', pin_temporal, 'telefono', telefono_e164)
       from acceso_pin where usuario_id = auth.uid()),
    jsonb_build_object('tiene_pin', false)
  );
$$;
revoke execute on function mi_pin_estado() from public;
grant execute on function mi_pin_estado() to authenticated;
