-- ─────────────────────────────────────────────────────────────
-- 0077 — Tasa del día propia para un Operador de Perú miembro.
--
-- El Operador principal de Perú puede habilitar (por miembro) que un
-- Operador de Perú miembro publique SU PROPIA Tasa del día
-- (Soles → Bolívares, Tv). Esa tasa propia solo aplica a los clientes que
-- ese miembro invitó (usuarios.invitado_por_operador_miembro_id) -- el
-- resto de los clientes del negocio (los del principal directamente)
-- siguen viendo y usando únicamente la tasa que publica el principal.
--
-- La Tasa de adquisición (Ta) sigue siendo exclusiva del principal: es el
-- costo real que el negocio paga por los bolívares, no cambia por miembro.
-- ─────────────────────────────────────────────────────────────

alter table operador_peru_miembro add column if not exists puede_editar_tasa boolean not null default false;

-- Fila de `tasas` publicada por un miembro (en vez de por el principal):
-- se distingue por este id (nulo cuando la tasa la publica el principal).
alter table tasas add column if not exists operador_peru_miembro_id uuid
  references operador_peru_miembro (id);

create index if not exists idx_tasas_operador_peru_miembro on tasas (operador_peru_miembro_id);

-- ─────────────────────────────────────────────────────────────
-- RLS: un cliente necesita leer `puede_editar_tasa` del miembro que lo
-- invitó, para saber si debe usar la tasa propia de ese miembro o la del
-- principal (ver (cliente)/index.tsx). Las policies existentes de
-- operador_peru_miembro solo cubren al dueño, al propio miembro y al VE
-- asignado -- ninguna cubre al cliente.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "operador_peru_miembro: cliente ve el suyo" on operador_peru_miembro;
create policy "operador_peru_miembro: cliente ve el suyo"
  on operador_peru_miembro for select
  using (id = (select invitado_por_operador_miembro_id from usuarios where id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- publicar_tasa_miembro: solo el propio miembro, y solo si el principal le
-- dio el permiso (puede_editar_tasa). Publica su propia Tv del día; no
-- toca la Ta (esa la sigue publicando el principal desde
-- publicar_tasa_del_dia).
-- ─────────────────────────────────────────────────────────────
create or replace function publicar_tasa_miembro(p_fecha date, p_tasa_pen_ves numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_miembro operador_peru_miembro;
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

  delete from tasas where fecha = p_fecha and operador_peru_miembro_id = v_miembro.id;
  insert into tasas (fecha, tasa_pen_ves, publicada_por, operador_peru_miembro_id)
  values (p_fecha, p_tasa_pen_ves, auth.uid(), v_miembro.id);
end;
$$;

grant execute on function publicar_tasa_miembro(date, numeric) to authenticated;
