-- Las políticas RLS de `solicitudes` para operadores eran de todo el
-- negocio, sin importar el rol: cualquier Operador de Perú miembro o
-- Operador de Venezuela podía leer (SELECT) y, los de Perú además
-- actualizar (UPDATE) TODAS las solicitudes del negocio -- no solo las
-- suyas -- si consultaban la tabla directo con su propio JWT (fuera de las
-- RPC de la app, que sí filtran correctamente por
-- negocio_operador_peru_id + operador_peru_miembro_id).
--
-- En la práctica la app SIEMPRE pasa por las RPC (validar_deposito_peru,
-- validar_deposito_venezuela, resolver_revision_beneficiario, etc., todas
-- SECURITY DEFINER con su propio chequeo de alcance), así que esto no
-- afectaba el uso normal de la app -- pero la política de RLS en sí misma
-- no reflejaba el aislamiento que el resto del proyecto sí implementa
-- (ver PeruDashboardView.tsx: el miembro solo consulta
-- operador_peru_miembro_id = su id; Venezuela solo los miembros que le
-- asignaron). Un miembro o un Operador Venezuela con su propio JWT podía
-- leer (y un miembro incluso actualizar) datos de clientes/operaciones que
-- no le correspondían, con una llamada directa a PostgREST.
--
-- Se agregan dos funciones de ayuda (mismo patrón que
-- mi_negocio_operador_peru_id()/rol_actual()) y se reescriben las
-- políticas para que cada rol solo vea/actualice lo suyo. El Operador
-- principal de Perú mantiene acceso a todo su negocio (lo necesita para
-- derivar solicitudes a miembros, ver el panel completo, etc.).

create or replace function mi_operador_peru_miembro_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from operador_peru_miembro where usuario_id = auth.uid();
$$;

create or replace function mis_miembros_asignados_ve()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(m.id), '{}'::uuid[])
  from operador_peru_miembro m
  join operador_venezuela_perfil v on v.id = m.operador_venezuela_id
  where v.usuario_id = auth.uid();
$$;

grant execute on function mi_operador_peru_miembro_id() to authenticated;
grant execute on function mis_miembros_asignados_ve() to authenticated;

drop policy if exists "solicitudes: operadores ven las de su negocio" on solicitudes;
create policy "solicitudes: operadores ven las de su negocio" on solicitudes
  for select
  using (
    negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and (
      rol_actual() = 'operador_peru'
      or (rol_actual() = 'operador_peru_miembro' and operador_peru_miembro_id = mi_operador_peru_miembro_id())
      or (rol_actual() = 'operador_venezuela' and operador_peru_miembro_id = any(mis_miembros_asignados_ve()))
    )
  );

drop policy if exists "solicitudes: Operador Perú actualiza las de su negocio" on solicitudes;
create policy "solicitudes: Operador Perú actualiza las de su negocio" on solicitudes
  for update
  using (
    negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and (
      rol_actual() = 'operador_peru'
      or (rol_actual() = 'operador_peru_miembro' and operador_peru_miembro_id = mi_operador_peru_miembro_id())
    )
  )
  with check (
    negocio_operador_peru_id = mi_negocio_operador_peru_id()
    and (
      rol_actual() = 'operador_peru'
      or (rol_actual() = 'operador_peru_miembro' and operador_peru_miembro_id = mi_operador_peru_miembro_id())
    )
  );
