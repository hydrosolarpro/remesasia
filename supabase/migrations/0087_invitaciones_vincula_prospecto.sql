-- Vincula la invitación de operador_peru con el prospecto que la generó,
-- para que Panel de Control pueda listar a quienes ya llenaron el
-- formulario de la landing pero todavía NO completaron el login con
-- Google (ver panel-control.tsx, sección "Pendientes de activar").
--
-- No se crea la cuenta de `usuarios` por adelantado a propósito:
-- `usuarios.id` exige una fila real en auth.users (usuarios_id_fkey), y
-- fabricar esa cuenta antes de que la persona entre con Google arriesga
-- que su login real choque después con un correo "ya registrado" y quede
-- sin poder entrar nunca -- por eso el prospecto se sigue viendo por
-- separado hasta que de verdad canjea su invitación.
alter table invitaciones add column prospecto_id uuid references prospectos (id);

create or replace function registrar_prospecto(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_pais text,
  p_opera_actualmente text,
  p_volumen_mensual text,
  p_tiene_equipo text,
  p_urgencia text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_puntaje int := 0;
  v_calificado boolean;
  v_admin_id uuid;
  v_token text;
  v_prospecto_id uuid;
begin
  if trim(coalesce(p_nombre, '')) = '' or trim(coalesce(p_telefono, '')) = '' or trim(coalesce(p_email, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'Faltan datos obligatorios.');
  end if;

  v_puntaje := v_puntaje + case p_opera_actualmente when 'ya_opero' then 40 when 'quiero_empezar' then 25 else 5 end;
  v_puntaje := v_puntaje + case p_volumen_mensual when 'mas_300' then 30 when '100_300' then 22 when '20_100' then 14 else 5 end;
  v_puntaje := v_puntaje + case p_tiene_equipo when 'con_equipo' then 15 when 'solo' then 10 else 3 end;
  v_puntaje := v_puntaje + case p_urgencia when 'esta_semana' then 15 when 'este_mes' then 8 else 2 end;
  v_calificado := v_puntaje >= 50;

  insert into prospectos (nombre, telefono, email, pais, opera_actualmente, volumen_mensual, tiene_equipo, urgencia, puntaje, calificado)
  values (trim(p_nombre), trim(p_telefono), trim(p_email), p_pais, p_opera_actualmente, p_volumen_mensual, p_tiene_equipo, p_urgencia, v_puntaje, v_calificado)
  returning id into v_prospecto_id;

  select id into v_admin_id from usuarios where email = 'productosaas2026@gmail.com';

  insert into invitaciones (tipo, creado_por, prospecto_id)
  values ('operador_peru', v_admin_id, v_prospecto_id)
  returning token into v_token;

  return jsonb_build_object('ok', true, 'calificado', v_calificado, 'puntaje', v_puntaje, 'invitacion_token', v_token);
end;
$$;
