-- Bug real detectado: canjear_invitacion() marcaba `usado_por`/`used_at`
-- para CUALQUIER tipo de invitación, incluida 'cliente' -- pese a que el
-- enlace de cliente está diseñado para ser reutilizable por TODOS los
-- clientes de un negocio (ver "Comparte tu página de clientes" en
-- app/app/(operador-peru)/clientes.tsx, que genera un único enlace
-- permanente). En la práctica, apenas el primer cliente lo usaba, quedaba
-- inválido para siempre ("Invitación inválida o ya usada.") para cualquier
-- otro cliente, incluido el propio operador probándolo de nuevo.
--
-- Los enlaces tipo 'operador_peru' (invitación puntual del admin a un
-- nuevo operador) sí deben seguir siendo de un solo uso.

create or replace function canjear_invitacion(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invitaciones;
  v_total_clientes int;
begin
  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  if inv.tipo = 'operador_peru' then
    update usuarios set rol = 'operador_peru', acceso_concedido = false, demo_inicio = now() where id = auth.uid();
  else
    if inv.negocio_operador_peru_id is not null then
      select count(*) into v_total_clientes
        from usuarios
        where negocio_operador_peru_id = inv.negocio_operador_peru_id and rol = 'cliente';
      if v_total_clientes >= 100 then
        return jsonb_build_object('ok', false, 'error', 'Este negocio ya alcanzó su límite de 100 clientes.');
      end if;
    end if;

    update usuarios
      set rol = 'cliente', negocio_operador_peru_id = inv.negocio_operador_peru_id
      where id = auth.uid();
  end if;

  -- Los enlaces de cliente quedan siempre reutilizables: nunca se marcan
  -- como usados. Solo las invitaciones puntuales (operador_peru) se
  -- consumen de un solo uso.
  if inv.tipo <> 'cliente' then
    update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;
  end if;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;
