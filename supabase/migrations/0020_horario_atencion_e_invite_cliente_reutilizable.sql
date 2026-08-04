-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.
-- (Superada más tarde por 0028/0026/0020: canjear_invitacion se reemplaza
-- varias veces en migraciones posteriores; se deja tal cual se aplicó.)

-- Horario de atención del Operador Perú (se muestra al cliente y en su
-- propio panel). Texto libre "HH:MM" en vez de `time` para evitar líos de
-- zona horaria entre Perú/Venezuela; se valida en el cliente.
alter table perfil_negocio
  add column if not exists horario_inicio text not null default '',
  add column if not exists horario_fin text not null default '';

-- El enlace de invitación a clientes debe ser único y reutilizable para
-- todos los clientes de un operador (a diferencia de la invitación de
-- Operador Perú, que sigue siendo de un solo uso). Se deja de marcar
-- `usado_por` para invitaciones tipo 'cliente', así el mismo token sigue
-- siendo válido (usado_por is null) sin importar cuántas veces se canjee.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
begin
  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
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
