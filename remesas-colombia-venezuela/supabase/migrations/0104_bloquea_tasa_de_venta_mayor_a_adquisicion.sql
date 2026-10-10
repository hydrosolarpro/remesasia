-- Bloquea en el servidor la causa raíz de una ganancia negativa: publicar
-- una Tasa del día (Tv) que sea mayor o igual que la Tasa de adquisición
-- (Ta). Antes solo se avisaba en la app (tasa.tsx, avisoPerdida) pero
-- nada lo impedía -- así se pudo publicar Tv=259/Ta=240 el 27/09/2026 y
-- generar una operación con ganancia bruta negativa (ver conversación:
-- "pero la ganancia bruta y neta no debe ser negativa nunca").
--
-- La app ahora también deshabilita el botón de guardar en ese caso, pero
-- este chequeo en publicar_tasa_del_dia / publicar_tasa_miembro es el que
-- de verdad protege: corre aunque alguien llame al RPC sin pasar por el
-- formulario.

create or replace function publicar_tasa_del_dia(p_fecha date, p_tasa_pen_ves numeric, p_tasa_adquisicion numeric default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if rol_actual() <> 'operador_peru' then
    raise exception 'Solo el Operador principal de Perú puede publicar la tasa del día';
  end if;

  if p_tasa_pen_ves is null or p_tasa_pen_ves <= 0 then
    raise exception 'La tasa de venta debe ser mayor que 0';
  end if;

  if p_tasa_adquisicion is not null and p_tasa_pen_ves >= p_tasa_adquisicion then
    raise exception
      'La tasa de venta (%) debe ser MENOR que la tasa de adquisición (%): si no, pierdes dinero en todas las operaciones.',
      p_tasa_pen_ves, p_tasa_adquisicion;
  end if;

  delete from tasas where fecha = p_fecha and publicada_por = auth.uid();
  insert into tasas (fecha, tasa_pen_ves, tasa_adquisicion, publicada_por)
  values (p_fecha, p_tasa_pen_ves, p_tasa_adquisicion, auth.uid());
end;
$$;

-- publicar_tasa_miembro no recibe Ta (el miembro siempre usa la del
-- principal, ver calcularGananciaOperacion): se valida contra la Ta MÁS
-- RECIENTE que el principal tenga publicada (cualquier fecha, igual que
-- ya hace PeruDashboardView.tsx al resolver la Ta vigente).
create or replace function publicar_tasa_miembro(p_fecha date, p_tasa_pen_ves numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_miembro operador_peru_miembro;
  v_ta_principal numeric;
begin
  if rol_actual() <> 'operador_peru_miembro' then
    raise exception 'Solo un Operador de Perú miembro puede publicar su propia tasa';
  end if;

  select * into v_miembro from operador_peru_miembro where usuario_id = auth.uid();

  if v_miembro.id is null then
    raise exception 'No se encontró tu perfil de Operador de Perú miembro';
  end if;

  if not v_miembro.puede_editar_tasa then
    raise exception 'Tu Operador principal de Perú no te habilitó para editar tu propia Tasa del día';
  end if;

  if p_tasa_pen_ves is null or p_tasa_pen_ves <= 0 then
    raise exception 'La tasa de venta debe ser mayor que 0';
  end if;

  select tasa_adquisicion into v_ta_principal
    from tasas
    where publicada_por = v_miembro.operador_peru_id and operador_peru_miembro_id is null
    order by fecha desc, created_at desc
    limit 1;

  if v_ta_principal is not null and p_tasa_pen_ves >= v_ta_principal then
    raise exception
      'Tu tasa de venta (%) debe ser MENOR que la tasa de adquisición del negocio (%): si no, pierdes dinero en tus operaciones.',
      p_tasa_pen_ves, v_ta_principal;
  end if;

  delete from tasas where fecha = p_fecha and operador_peru_miembro_id = v_miembro.id;
  insert into tasas (fecha, tasa_pen_ves, publicada_por, operador_peru_miembro_id)
  values (p_fecha, p_tasa_pen_ves, auth.uid(), v_miembro.id);
end;
$$;

grant execute on function publicar_tasa_del_dia(date, numeric, numeric) to authenticated;
grant execute on function publicar_tasa_miembro(date, numeric) to authenticated;
