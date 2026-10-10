-- Límite de 100 clientes por negocio (ver lib/plan.ts LIMITE_CLIENTES):
-- canjear_invitacion() ahora rechaza el canje de una invitación tipo
-- 'cliente' si el negocio ya llegó al tope, antes de vincular la cuenta.
create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
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

  update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;
