-- Row Level Security — cada rol solo ve/modifica lo que le corresponde.

-- Helper: rol del usuario autenticado, sin recursión de RLS sobre `usuarios`.
create function rol_actual() returns rol
language sql stable security definer set search_path = public as $$
  select rol from usuarios where id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- usuarios
-- ─────────────────────────────────────────────────────────────
alter table usuarios enable row level security;

create policy "usuarios: cada quien ve y edita su propia fila"
  on usuarios for select using (id = auth.uid());

create policy "usuarios: operadores ven todas las filas"
  on usuarios for select using (rol_actual() in ('operador_peru', 'operador_venezuela'));

create policy "usuarios: cada quien actualiza su propia fila"
  on usuarios for update using (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- tasas — lectura para todos los autenticados, publicación solo Op. Perú
-- ─────────────────────────────────────────────────────────────
alter table tasas enable row level security;

create policy "tasas: lectura para todos los autenticados"
  on tasas for select using (auth.role() = 'authenticated');

create policy "tasas: solo Operador Perú publica"
  on tasas for insert with check (rol_actual() = 'operador_peru');

-- ─────────────────────────────────────────────────────────────
-- solicitudes
-- ─────────────────────────────────────────────────────────────
alter table solicitudes enable row level security;

create policy "solicitudes: cliente ve las suyas"
  on solicitudes for select using (cliente_id = auth.uid());

create policy "solicitudes: operadores ven todas"
  on solicitudes for select using (rol_actual() in ('operador_peru', 'operador_venezuela'));

create policy "solicitudes: cliente crea la suya en PENDIENTE"
  on solicitudes for insert
  with check (cliente_id = auth.uid() and estado = 'PENDIENTE');

create policy "solicitudes: cliente actualiza la suya mientras PENDIENTE"
  on solicitudes for update
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());

create policy "solicitudes: Operador Perú actualiza cualquiera"
  on solicitudes for update
  using (rol_actual() = 'operador_peru')
  with check (rol_actual() = 'operador_peru');

create policy "solicitudes: Operador Venezuela actualiza cualquiera"
  on solicitudes for update
  using (rol_actual() = 'operador_venezuela')
  with check (rol_actual() = 'operador_venezuela');

-- ─────────────────────────────────────────────────────────────
-- mensajes_chat — solo entre operadores (reemplaza WhatsApp entre ellos)
-- ─────────────────────────────────────────────────────────────
alter table mensajes_chat enable row level security;

create policy "chat: solo operadores leen"
  on mensajes_chat for select using (rol_actual() in ('operador_peru', 'operador_venezuela'));

create policy "chat: solo operadores escriben como ellos mismos"
  on mensajes_chat for insert
  with check (
    rol_actual() in ('operador_peru', 'operador_venezuela')
    and autor_id = auth.uid()
    and autor_rol = rol_actual()
  );
