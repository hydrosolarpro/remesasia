-- Tasa especial del día por cliente: el Operador principal fija, para un
-- cliente concreto, una tasa PEN->VES distinta de la general solo para ese
-- día. El cliente la ve en su Inicio y se usa en sus solicitudes del día.
-- Sin fila vigente (fecha = hoy en Lima) se usa la tasa general de siempre.
create table if not exists tasas_cliente (
  id uuid primary key default gen_random_uuid(),
  negocio_operador_peru_id uuid not null references usuarios(id) on delete cascade,
  cliente_id uuid not null references usuarios(id) on delete cascade,
  corredor text not null default 'PE-VE',
  fecha date not null,
  tasa_pen_ves numeric not null check (tasa_pen_ves > 0),
  publicada_por uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, corredor, fecha)
);

create index if not exists tasas_cliente_negocio_fecha_idx
  on tasas_cliente (negocio_operador_peru_id, fecha);

alter table tasas_cliente enable row level security;

-- El cliente ve solo las suyas; el negocio (principal y su equipo) ve las del negocio.
create policy "tasas_cliente: lectura cliente o negocio" on tasas_cliente
  for select using (
    cliente_id = auth.uid()
    or negocio_operador_peru_id = mi_negocio_operador_peru_id()
    or rol_actual() = 'administrador'
  );

-- Solo el Operador principal (dueño del negocio) las crea/cambia/borra, y
-- solo para clientes de su propio negocio.
create policy "tasas_cliente: principal inserta" on tasas_cliente
  for insert with check (
    negocio_operador_peru_id = auth.uid()
    and exists (select 1 from usuarios c where c.id = cliente_id and c.rol = 'cliente' and c.negocio_operador_peru_id = auth.uid())
  );

create policy "tasas_cliente: principal actualiza" on tasas_cliente
  for update using (negocio_operador_peru_id = auth.uid())
  with check (negocio_operador_peru_id = auth.uid());

create policy "tasas_cliente: principal borra" on tasas_cliente
  for delete using (negocio_operador_peru_id = auth.uid());
