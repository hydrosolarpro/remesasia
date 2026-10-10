-- Repara dos piezas de la migración 0051_equipos_operadores.sql que nunca
-- quedaron aplicadas en producción, y que en conjunto impiden que un
-- Operador de Perú MIEMBRO invite a sus propios clientes:
--
-- 1) RLS de `invitaciones` solo tenía la política antigua
--    ("operador_peru crea y ve las de su negocio"), que exige
--    negocio_operador_peru_id = auth.uid() -- eso solo es cierto para el
--    Operador principal (para un miembro, auth.uid() es SU propio id, no
--    el del negocio). Por eso el botón "Compartir por WhatsApp" fallaba
--    silenciosamente al crear/leer la invitación de un miembro.
--
-- 2) canjear_invitacion() nunca copiaba inv.operador_peru_miembro_id hacia
--    usuarios.invitado_por_operador_miembro_id -- aunque el paso 1 se
--    arreglara, el cliente registrado quedaría igual atribuido al
--    Operador principal (sin miembro) en vez de a quien lo invitó
--    realmente, rompiendo "el registro debe quedar en su propia sesión".

create policy "invitaciones: miembro peru crea y ve invitaciones de su negocio"
  on invitaciones for all
  using (tipo = 'cliente' and negocio_operador_peru_id = mi_negocio_operador_peru_id())
  with check (
    tipo = 'cliente'
    and negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and creado_por = auth.uid()
  );

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
      set rol = 'cliente',
          negocio_operador_peru_id = inv.negocio_operador_peru_id,
          invitado_por_operador_miembro_id = inv.operador_peru_miembro_id
      where id = auth.uid();
  end if;

  if inv.tipo <> 'cliente' then
    update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;
  end if;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;
