-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Bug real detectado: la cuenta admin bootstrap (productosaas2026@gmail.com)
-- canjeó una invitación de Operador Perú generada para pruebas y perdió su
-- rol de administrador, quedando bloqueada en su propia app. Blindamos
-- canjear_invitacion para que nunca cambie el rol de una cuenta que ya es
-- administrador.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  rol_actual_usuario rol;
begin
  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  select u.rol into rol_actual_usuario from usuarios u where u.id = auth.uid();

  if rol_actual_usuario = 'administrador' then
    return jsonb_build_object('ok', false, 'error', 'Tu cuenta ya es administrador, no puede canjear invitaciones.');
  end if;

  if inv.tipo = 'operador_peru' then
    update usuarios set rol = 'operador_peru', acceso_concedido = false where id = auth.uid();
    update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;
  else
    update usuarios
      set rol = 'cliente', negocio_operador_peru_id = inv.negocio_operador_peru_id
      where id = auth.uid();
  end if;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;
