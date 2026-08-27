-- registrar_prospecto() ahora también crea la invitación de tipo
-- 'operador_peru' del prospecto (igual que hacía a mano el admin en
-- (admin)/crm-prospectos.tsx con "Generar y enviar invitación DEMO") y
-- devuelve su token -- así la landing puede llevar al visitante directo a
-- /invitacion/<token> apenas termina el cuestionario, sin depender de que
-- un admin revise el CRM y genere el enlace manualmente.
--
-- El acceso ya NO depende de `calificado`: se otorga a todo el que
-- completa el formulario, calificado o no -- el puntaje se sigue
-- calculando y guardando solo para que el admin priorice su seguimiento
-- comercial en el CRM.
--
-- `creado_por` de la invitación queda fijo en la cuenta admin bootstrap
-- (productosaas2026@gmail.com, ver 0009_administrador_trigger.sql), porque
-- quien llama a este RPC es un visitante anónimo sin fila en `usuarios`.
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
  values (trim(p_nombre), trim(p_telefono), trim(p_email), p_pais, p_opera_actualmente, p_volumen_mensual, p_tiene_equipo, p_urgencia, v_puntaje, v_calificado);

  select id into v_admin_id from usuarios where email = 'productosaas2026@gmail.com';

  insert into invitaciones (tipo, creado_por)
  values ('operador_peru', v_admin_id)
  returning token into v_token;

  return jsonb_build_object('ok', true, 'calificado', v_calificado, 'puntaje', v_puntaje, 'invitacion_token', v_token);
end;
$$;
