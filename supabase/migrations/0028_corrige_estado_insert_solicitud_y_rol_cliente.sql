-- Backfill: aplicada en producción el 2026-07-26 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Bug real: la política RLS de INSERT en solicitudes exigía
-- estado = 'PENDIENTE', pero la app siempre inserta 'EN_VERIFICACION'
-- (así lo usan EstadoBadge, los filtros y todo el flujo). La política
-- nunca coincidía con lo que mandaba la app, así que TODO envío de
-- solicitud fallaba con "row-level security policy" — no era un bug de
-- esta sesión, ya venía así desde antes.
drop policy if exists "solicitudes: cliente crea la suya en su negocio" on solicitudes;
create policy "solicitudes: cliente crea la suya en su negocio"
  on solicitudes for insert
  with check (
    cliente_id = auth.uid()
    and estado = 'EN_VERIFICACION'
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );

-- Mismo tipo de bug que ya blindamos para 'administrador': un Operador
-- Perú (o Venezuela) que abre por error un enlace de invitación de
-- cliente (p.ej. probando su propio enlace) no debe poder convertirse en
-- cliente de su propio negocio — perdería su cuenta de operador.
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

  if inv.tipo = 'operador_peru' and rol_actual_usuario in ('operador_peru', 'operador_venezuela') then
    return jsonb_build_object('ok', false, 'error', 'Tu cuenta ya es operador, no puede canjear otra invitación de operador.');
  end if;

  if inv.tipo = 'cliente' and rol_actual_usuario in ('operador_peru', 'operador_venezuela') then
    return jsonb_build_object('ok', false, 'error', 'Tu cuenta ya es operador — usa otra cuenta de Google para probar el flujo de cliente.');
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

-- Repara la cuenta de José Silva: su enlace de cliente lo canjeó él
-- mismo (probando su propio enlace de invitación) y quedó convertido en
-- cliente de su propio negocio, perdiendo su cuenta de operador. Se deja
-- tal cual se aplicó en su momento (idempotente: no-op si ya está bien).
update usuarios
  set rol = 'operador_peru', negocio_operador_peru_id = null
  where id = 'ab5fa4df-d017-4c14-ba6e-5b8b1f08937a' and rol <> 'operador_peru';
