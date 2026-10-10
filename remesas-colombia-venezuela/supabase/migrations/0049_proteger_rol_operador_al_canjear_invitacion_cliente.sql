-- Bug de seguridad/integridad real: si una cuenta con sesión YA activa
-- (p.ej. un operador Perú probando su propio enlace, o cualquiera con una
-- cuenta de Google ya logueada en ese navegador) abre un enlace de
-- invitación de CLIENTE, canjear_invitacion() sobreescribía en silencio su
-- `rol` a 'cliente' -- pudiendo convertir una cuenta de operador en
-- cliente por accidente. Esto ya le ocurrió a una cuenta real (quedó con
-- negocio_operador_peru_id apuntando a otro negocio de forma inconsistente).
--
-- Ahora, si la cuenta que canjea YA tiene un rol distinto de 'cliente'
-- (operador_peru, operador_peru_miembro, operador_venezuela, administrador),
-- se rechaza con un mensaje claro en vez de sobreescribir el rol.

create or replace function canjear_invitacion(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invitaciones;
  v_total_clientes int;
  v_rol_actual rol;
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
      if v_total_clientes >= 100 then
        return jsonb_build_object('ok', false, 'error', 'Este negocio ya alcanzó su límite de 100 clientes.');
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
