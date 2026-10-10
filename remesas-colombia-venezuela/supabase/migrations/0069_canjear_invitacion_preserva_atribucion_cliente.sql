-- El enlace de invitación de cliente es reutilizable (0047) y nunca marca
-- `usado_por` para tipo 'cliente' -- así el operador comparte UN solo
-- enlace fijo. El problema: canjear_invitacion() reescribía SIEMPRE
-- negocio_operador_peru_id e invitado_por_operador_miembro_id cada vez que
-- se canjeaba, sin importar si la cuenta YA era cliente registrado de ese
-- negocio. Cada vez que el cliente reabría su enlace (guardado en WhatsApp,
-- o el botón "Accede YA" de la landing) con sesión activa, se volvía a
-- correr canjear_invitacion() y se pisaba su atribución con el
-- operador_peru_miembro_id ORIGINAL grabado en ese token -- deshaciendo
-- cualquier derivar_cliente() posterior del operador principal. Efecto
-- visible: el cliente "desaparecía" de la lista de clientes del operador de
-- Perú miembro que lo venía atendiendo (app/(operador-peru)/clientes.tsx
-- filtra por invitado_por_operador_miembro_id) apenas se completaba una
-- operación y el cliente volvía a entrar por ese enlace.
--
-- Ahora: si la cuenta ya es cliente registrado de ESE MISMO negocio, el
-- canje solo reactiva (eliminado_at = null) sin tocar su atribución -- un
-- cliente ya registrado no debe perderse ni reasignarse solo por reabrir su
-- enlace de invitación. La atribución solo se fija la primera vez (alta
-- nueva) o si el cliente pasa a otro negocio distinto.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
  v_negocio_actual uuid;
  v_plan_negocio text;
begin
  select rol, negocio_operador_peru_id into v_rol_actual, v_negocio_actual from usuarios where id = auth.uid();

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
    -- Ya es cliente registrado de este negocio: solo reactivar si estaba
    -- eliminado (borrado lógico), sin tocar su atribución de operador.
    update usuarios set eliminado_at = null where id = auth.uid();
  else
    if inv.negocio_operador_peru_id is not null then
      select count(*) into v_total_clientes
        from usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente' and eliminado_at is null;

      select plan into v_plan_negocio from usuarios where id = inv.negocio_operador_peru_id;

      if v_total_clientes >= limite_clientes_plan(v_plan_negocio) then
        return jsonb_build_object('ok', false, 'error', 'Este negocio ya alcanzó su límite de ' || limite_clientes_plan(v_plan_negocio) || ' clientes de su plan actual.');
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

-- Reconciliación: derivar_cliente() ya existía desplegada en producción
-- (RPC que usa app/(operador-peru)/clientes.tsx y ClientesMiembroList.tsx
-- para que el Operador principal reasigne un cliente a otro operador de
-- Perú miembro) pero nunca quedó registrada en una migración local -- se
-- deja acá sin cambios de comportamiento, solo para que el repo refleje el
-- esquema real.
create or replace function derivar_cliente(p_cliente_id uuid, p_operador_peru_miembro_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede derivar clientes';
  end if;

  if not exists (
    select 1 from operador_peru_miembro
    where id = p_operador_peru_miembro_id and operador_peru_id = auth.uid()
  ) then
    raise exception 'Ese operador de Perú no pertenece a tu negocio';
  end if;

  update usuarios
    set invitado_por_operador_miembro_id = p_operador_peru_miembro_id
    where id = p_cliente_id
      and rol = 'cliente'
      and negocio_operador_peru_id = auth.uid();
end;
$$;

grant execute on function derivar_cliente(uuid, uuid) to authenticated;
