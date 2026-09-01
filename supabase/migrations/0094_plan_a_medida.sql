-- PLAN A LA MEDIDA
--
-- El operador principal de Perú puede contratar un plan cuyo precio
-- mensual se calcula solo: N° de clientes que solicita × S/ 1 / mes. Las
-- "características" (cupos de equipo Perú/Venezuela y contenido) se heredan
-- del tramo estándar equivalente al N° de clientes:
--
--   1 – 100  -> STARTER   |  101 – 200 -> PRO     |  201 – 400 -> EXPERT
--   401 – 600 -> AVANCE   |  601 – 1000 -> ULTRA  |  > 1000 -> se deriva a UNLIMITED
--
-- El cupo de clientes del negocio pasa a ser exactamente ese N pactado
-- (se guarda en usuarios.limite_clientes_unlimited, la misma columna que
-- ya usa UNLIMITED para su cupo caso por caso -- ver lib/plan.ts
-- obtenerLimitesPlan).
--
-- Reusa toda la maquinaria de pago que ya existe: el operador lo solicita
-- desde su Perfil con el formulario normal (formas de pago / comprobante /
-- términos), la fila se marca con `plan_a_medida = true` y `monto` = N, y
-- el administrador valida el pago manualmente antes de conceder el acceso
-- (mismo doble candado que el resto de los planes -- ver
-- SuscripcionGate.tsx y (admin)/panel-control.tsx). A diferencia de
-- UNLIMITED, el admin NO fija el monto: ya viene calculado.

-- 1. Nuevo valor de plan permitido en usuarios.
alter table usuarios drop constraint if exists usuarios_plan_check;
alter table usuarios add constraint usuarios_plan_check check (
  plan in ('demo', 'starter', 'pro', 'expert', 'avance', 'ultra', 'unlimited', 'medida')
);

-- 2. Marca de "esta solicitud es un plan a la medida" en las dos tablas de
--    pago. `pagos_suscripcion` no tiene columna de plan solicitado (el
--    plan se deduce del monto vía planDesdeMonto), así que sin esta marca
--    un pago a la medida de S/ 100 se confundiría con STARTER. En
--    `cambios_plan_pendientes` además se usa plan_solicitado = 'medida'.
alter table pagos_suscripcion add column if not exists plan_a_medida boolean not null default false;
alter table cambios_plan_pendientes add column if not exists plan_a_medida boolean not null default false;

-- 3. admin_validar_cambio_plan: al activar un cambio a 'medida' (igual que
--    con 'unlimited') copia el cupo de clientes pactado a
--    usuarios.limite_clientes_unlimited.
create or replace function admin_validar_cambio_plan(p_cambio_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_cambio cambios_plan_pendientes;
  v_usuario usuarios;
begin
  if rol_actual() <> 'administrador' then
    raise exception 'Solo el administrador puede validar cambios de plan';
  end if;

  select * into v_cambio from cambios_plan_pendientes
    where id = p_cambio_id and estado = 'pendiente' for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Solicitud no encontrada o ya procesada.');
  end if;

  select * into v_usuario from usuarios where id = v_cambio.operador_peru_id for update;

  update cambios_plan_pendientes
    set estado = 'verificado', verificado_por = auth.uid(), verificado_at = now()
    where id = p_cambio_id;

  if v_usuario.plan = 'demo' or v_usuario.plan_inicio is null
     or v_usuario.plan_inicio + interval '30 days' <= now() then
    update usuarios
      set plan = v_cambio.plan_solicitado,
          plan_inicio = now(),
          acceso_concedido = true,
          limite_clientes_unlimited = case
            when v_cambio.plan_solicitado in ('unlimited', 'medida') then v_cambio.limite_clientes
            else limite_clientes_unlimited
          end
      where id = v_cambio.operador_peru_id;
    update cambios_plan_pendientes set activado_at = now() where id = p_cambio_id;
    return jsonb_build_object('ok', true, 'modo', 'inmediato');
  else
    return jsonb_build_object('ok', true, 'modo', 'encolado');
  end if;
end;
$$;

-- 4. activar_planes_encolados: mismo ajuste para los cambios a 'medida'
--    que se activan solos al terminar el ciclo vigente (cron).
create or replace function activar_planes_encolados() returns void
language plpgsql security definer set search_path = public as $$
begin
  with vencidos as (
    select c.id as cambio_id, c.operador_peru_id, c.plan_solicitado, c.limite_clientes
    from cambios_plan_pendientes c
    join usuarios u on u.id = c.operador_peru_id
    where c.estado = 'verificado' and c.activado_at is null
      and u.plan_inicio is not null and u.plan_inicio + interval '30 days' <= now()
  ),
  upd as (
    update usuarios u
      set plan = v.plan_solicitado,
          plan_inicio = u.plan_inicio + interval '30 days',
          limite_clientes_unlimited = case
            when v.plan_solicitado in ('unlimited', 'medida') then v.limite_clientes
            else u.limite_clientes_unlimited
          end
    from vencidos v where u.id = v.operador_peru_id returning u.id
  )
  update cambios_plan_pendientes c set activado_at = now()
    from vencidos v where c.id = v.cambio_id;
end;
$$;

-- 5. canjear_invitacion: para un negocio en plan 'medida' el tope de
--    clientes es exactamente el N pactado (usuarios.limite_clientes_unlimited),
--    no el "sin tope práctico" que limite_clientes_plan() devuelve para
--    cualquier plan no reconocido.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
  v_negocio_actual uuid;
  v_eliminado_at timestamptz;
  v_plan_negocio text;
  v_limite_medida int;
  v_tope int;
begin
  select rol, negocio_operador_peru_id, eliminado_at into v_rol_actual, v_negocio_actual, v_eliminado_at from usuarios where id = auth.uid();

  if v_rol_actual = 'administrador' then
    return jsonb_build_object('ok', false, 'error', 'Tu cuenta ya es administrador, no puede canjear invitaciones.');
  end if;

  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  if inv.tipo = 'cliente' and v_rol_actual is not null and v_rol_actual <> 'cliente' then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'rol_distinto',
      'error', 'Esta cuenta ya está registrada como ' || v_rol_actual || '. Cierra sesión y continúa con otra cuenta de Google para registrarte como cliente nuevo.'
    );
  end if;

  if inv.tipo = 'operador_peru' then
    update usuarios set rol = 'operador_peru', acceso_concedido = false, demo_inicio = now() where id = auth.uid();
  elsif v_rol_actual = 'cliente' and v_negocio_actual is not null and v_negocio_actual = inv.negocio_operador_peru_id then
    if v_eliminado_at is not null then
      update usuarios
        set eliminado_at = null,
            invitado_por_operador_miembro_id = inv.operador_peru_miembro_id
        where id = auth.uid();
    else
      update usuarios set eliminado_at = null where id = auth.uid();
    end if;
  else
    if inv.negocio_operador_peru_id is not null then
      select count(*) into v_total_clientes
        from usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente' and eliminado_at is null;

      select plan, limite_clientes_unlimited into v_plan_negocio, v_limite_medida
        from usuarios where id = inv.negocio_operador_peru_id;

      if v_plan_negocio in ('medida', 'unlimited') then
        v_tope := coalesce(v_limite_medida, 2147483647);
      else
        v_tope := limite_clientes_plan(v_plan_negocio);
      end if;

      if v_total_clientes >= v_tope then
        return jsonb_build_object('ok', false, 'error', 'Este negocio ya alcanzó su límite de ' || v_tope || ' clientes de su plan actual.');
      end if;
    end if;

    update usuarios
      set rol = 'cliente',
          negocio_operador_peru_id = inv.negocio_operador_peru_id,
          invitado_por_operador_miembro_id = inv.operador_peru_miembro_id,
          eliminado_at = null
      where id = auth.uid();
  end if;

  if inv.tipo <> 'cliente' then
    update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;
  end if;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;

grant execute on function canjear_invitacion(text) to authenticated;
