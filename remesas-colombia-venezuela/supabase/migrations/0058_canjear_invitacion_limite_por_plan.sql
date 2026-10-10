-- Backfill: aplicada en producción el 2026-08-01 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- El límite de clientes por negocio estaba fijo en 100 sin importar el
-- plan real (ver "SOBRE PLANES Y PAGOS/sobre-planes.md" y lib/plan.ts en
-- la app, que ya manejan el límite correcto por plan). Esto hacía que un
-- negocio ya subido a PRO/EXPERT/etc. siguiera bloqueado en 100 clientes
-- al canjear una invitación. Se agrega un espejo en SQL de los límites por
-- plan para que la migración de plan aplique de inmediato en todo el
-- backend, no solo en la UI.
create or replace function limite_clientes_plan(p_plan text) returns int
language sql immutable as $$
  select case p_plan
    when 'demo' then 50
    when 'starter' then 100
    when 'pro' then 200
    when 'expert' then 400
    when 'avance' then 600
    when 'ultra' then 1000
    else 2147483647 -- unlimited (u otro no reconocido): acordado con el administrador, sin tope práctico
  end;
$$;

create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
  v_plan_negocio text;
begin
  select rol into v_rol_actual from usuarios where id = auth.uid();

  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  if inv.tipo = 'cliente' and v_rol_actual is not null and v_rol_actual <> 'cliente' then
    return jsonb_build_object(
      'ok', false,
      'error', 'Esta cuenta ya está registrada como ' || v_rol_actual || '. Cierra sesión y continúa con otra cuenta de Google para registrarte como cliente nuevo.'
    );
  end if;

  if inv.tipo = 'operador_peru' then
    update usuarios set rol = 'operador_peru', acceso_concedido = false, demo_inicio = now() where id = auth.uid();
  else
    if inv.negocio_operador_peru_id is not null then
      select count(*) into v_total_clientes
        from usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente';

      select plan into v_plan_negocio from usuarios where id = inv.negocio_operador_peru_id;

      if v_total_clientes >= limite_clientes_plan(v_plan_negocio) then
        return jsonb_build_object('ok', false, 'error', 'Este negocio ya alcanzó su límite de ' || limite_clientes_plan(v_plan_negocio) || ' clientes de su plan actual.');
      end if;
    end if;

    update usuarios
      set rol = 'cliente', negocio_operador_peru_id = inv.negocio_operador_peru_id
      where id = auth.uid();
  end if;

  if inv.tipo <> 'cliente' then
    update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;
  end if;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;

grant execute on function canjear_invitacion(text) to authenticated;
