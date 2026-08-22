-- CRM de prospectos: leads captados por la landing de ventas del SaaS
-- (remesas-perú-venezuela/, dirigida a dueños de negocios de remesas, no a
-- clientes finales -- esa es otra landing, envíoya). El cuestionario filtro
-- de esa landing llama a registrar_prospecto() sin sesión (visitante
-- anónimo) para guardar el lead y calcular su puntaje de calificación; el
-- CRM en (admin)/crm-prospectos.tsx es la única pantalla que lee/edita esta
-- tabla.
create table prospectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  email text not null,
  pais text not null check (pais in ('peru', 'venezuela', 'ambos')),
  opera_actualmente text not null check (opera_actualmente in ('ya_opero', 'quiero_empezar', 'solo_investigando')),
  volumen_mensual text not null check (volumen_mensual in ('menos_20', '20_100', '100_300', 'mas_300')),
  tiene_equipo text not null check (tiene_equipo in ('con_equipo', 'solo', 'sin_equipo')),
  urgencia text not null check (urgencia in ('esta_semana', 'este_mes', 'explorando')),
  puntaje int not null default 0,
  calificado boolean not null default false,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'demo_enviado', 'convertido', 'descartado')),
  notas text,
  contactado_por uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table prospectos enable row level security;

create policy "prospectos: solo admin lee y edita"
  on prospectos for all
  using (rol_actual() = 'administrador')
  with check (rol_actual() = 'administrador');

-- Alta pública (visitante sin sesión) desde la landing externa. Primer RPC
-- del proyecto otorgado a `anon` -- el resto son `to authenticated`. Se usa
-- un RPC en vez de una policy de insert directa para calcular el puntaje en
-- el servidor (no confiar en un puntaje calculado en el cliente) y para no
-- exponer la tabla completa a insert arbitrario.
create function registrar_prospecto(
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

  return jsonb_build_object('ok', true, 'calificado', v_calificado, 'puntaje', v_puntaje);
end;
$$;

grant execute on function registrar_prospecto(text, text, text, text, text, text, text, text) to anon;
