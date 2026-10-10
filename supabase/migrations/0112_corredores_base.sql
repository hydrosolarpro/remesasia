-- CORREDORES (fase 1): una sola base para varios corredores de remesas
-- (país de recepción -> Venezuela). 100% ADITIVA: Perú-Venezuela ('PE-VE')
-- sigue funcionando igual -- todo lo existente queda como 'PE-VE' por el
-- valor por defecto, y ninguna función/política existente cambia salvo la
-- normalización de teléfonos (que conserva exactamente el comportamiento
-- de Perú y Venezuela y solo AGREGA Colombia y Chile).
--
-- Nomenclatura: se mantienen los nombres internos (`operador_peru`,
-- `monto_pen`, `tasa_pen_ves`, enum `yape`/`plin`...); significan "país de
-- recepción" y su moneda. Lo que cambia por corredor son los textos y la
-- moneda que muestra la app (ver tabla `corredores`).

-- 1) Catálogo de corredores ------------------------------------------------
create table if not exists corredores (
  id text primary key,                    -- 'PE-VE', 'CO-VE', 'CL-VE', 'OT-VE'
  pais_recepcion text not null,
  pais_entrega text not null default 'Venezuela',
  moneda_codigo text,                     -- 'PEN', 'COP', 'CLP' (OT-VE: la define el negocio)
  moneda_simbolo text,
  prefijo_tel text,                       -- sin '+', p. ej. '57'
  digitos_tel int,
  billetera_1 text,
  billetera_2 text,
  etiqueta_cuenta text,
  documento_principal text,
  orden int not null default 0,
  activo_global boolean not null default true
);

insert into corredores (id, pais_recepcion, moneda_codigo, moneda_simbolo, prefijo_tel, digitos_tel,
                        billetera_1, billetera_2, etiqueta_cuenta, documento_principal, orden)
values
  ('PE-VE', 'Perú',     'PEN', 'S/', '51', 9,  'Yape',   'Plin',        'CCI',                    'DNI',            1),
  ('CO-VE', 'Colombia', 'COP', '$',  '57', 10, 'Nequi',  'Daviplata',   'Llave / Nº de cuenta',   'Cédula (CC)',    2),
  ('CL-VE', 'Chile',    'CLP', '$',  '56', 9,  'Mach',   'Tenpo',       'Cuenta RUT / Nº cuenta', 'RUT',            3),
  ('OT-VE', 'Otro país', null, null, null, null, null,    null,          'Nº de cuenta',           'Documento',      4)
on conflict (id) do nothing;

alter table corredores enable row level security;
drop policy if exists "corredores: lectura autenticados" on corredores;
create policy "corredores: lectura autenticados" on corredores
  for select to authenticated using (true);

-- 2) Corredores que trabaja cada negocio (los elige el operador principal) --
create table if not exists negocio_corredores (
  negocio_id uuid not null references usuarios (id) on delete cascade,
  corredor text not null references corredores (id),
  activo boolean not null default true,
  -- Solo para 'OT-VE' (Otro país): lo define el operador principal.
  pais_nombre text,
  moneda_codigo text,
  moneda_simbolo text,
  prefijo_tel text,
  created_at timestamptz not null default now(),
  primary key (negocio_id, corredor)
);

alter table negocio_corredores enable row level security;

-- Todos los roles del negocio (principal, miembros, VE y clientes) pueden
-- LEER los corredores de su negocio (para mostrar el selector); solo el
-- operador principal (dueño) los crea/edita.
drop policy if exists "negocio_corredores: lectura del negocio" on negocio_corredores;
create policy "negocio_corredores: lectura del negocio" on negocio_corredores
  for select to authenticated
  using (negocio_id = mi_negocio_operador_peru_id());

drop policy if exists "negocio_corredores: el principal administra" on negocio_corredores;
create policy "negocio_corredores: el principal administra" on negocio_corredores
  for all to authenticated
  using (negocio_id = auth.uid() and rol_actual() = 'operador_peru')
  with check (negocio_id = auth.uid() and rol_actual() = 'operador_peru');

-- Todo negocio existente trabaja Perú-Venezuela.
insert into negocio_corredores (negocio_id, corredor)
select id, 'PE-VE' from usuarios where rol = 'operador_peru'
on conflict do nothing;

-- 3) Columna `corredor` (default 'PE-VE': nada existente cambia) ------------
alter table solicitudes
  add column if not exists corredor text not null default 'PE-VE' references corredores (id);
alter table tasas
  add column if not exists corredor text not null default 'PE-VE' references corredores (id);
alter table cuentas_bancarias_operador
  add column if not exists corredor text not null default 'PE-VE' references corredores (id);
alter table cierres_diarios_operador
  add column if not exists corredor text not null default 'PE-VE' references corredores (id);

create index if not exists idx_solicitudes_corredor on solicitudes (negocio_operador_peru_id, corredor);
create index if not exists idx_tasas_corredor on tasas (publicada_por, corredor, fecha desc);

-- Una solicitud solo puede crearse en un corredor ACTIVO de su negocio.
create or replace function validar_corredor_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.corredor = 'PE-VE' then
    return new;  -- comportamiento histórico: sin validación extra
  end if;
  if not exists (
    select 1 from negocio_corredores
    where negocio_id = new.negocio_operador_peru_id and corredor = new.corredor and activo
  ) then
    raise exception 'Este negocio no tiene activo el corredor %', new.corredor;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_corredor_solicitud on solicitudes;
create trigger trg_validar_corredor_solicitud
  before insert on solicitudes
  for each row execute function validar_corredor_solicitud();

-- 4) Datos de pago por corredor (billeteras, QR y medio extra) --------------
-- Perú-Venezuela sigue usando las columnas de `perfil_negocio`. Los demás
-- corredores guardan aquí lo mismo, con billetera_1/billetera_2 = Nequi /
-- Daviplata (CO), Mach / Tenpo (CL), etc. según `corredores`.
create table if not exists perfil_negocio_corredor (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null references usuarios (id) on delete cascade,
  corredor text not null references corredores (id),
  billetera_1_telefono text,
  billetera_2_telefono text,
  billetera_1_qr_url text,
  billetera_2_qr_url text,
  otro_medio_nombre text,
  otro_medio_telefono text,
  updated_at timestamptz not null default now(),
  unique (operador_peru_id, corredor)
);

alter table perfil_negocio_corredor enable row level security;

drop policy if exists "perfil_negocio_corredor: lectura del negocio" on perfil_negocio_corredor;
create policy "perfil_negocio_corredor: lectura del negocio" on perfil_negocio_corredor
  for select to authenticated
  using (operador_peru_id = mi_negocio_operador_peru_id());

drop policy if exists "perfil_negocio_corredor: el principal administra" on perfil_negocio_corredor;
create policy "perfil_negocio_corredor: el principal administra" on perfil_negocio_corredor
  for all to authenticated
  using (operador_peru_id = auth.uid() and rol_actual() = 'operador_peru')
  with check (operador_peru_id = auth.uid() and rol_actual() = 'operador_peru');

-- 5) Teléfonos: se AGREGAN Colombia (+57) y Chile (+56). Perú y Venezuela
--    quedan exactamente igual que en 0099.
create or replace function normalizar_telefono_e164(p_tel text) returns text
language plpgsql immutable as $$
declare d text;
begin
  if p_tel is null then return null; end if;
  d := regexp_replace(p_tel, '\D', '', 'g');
  if d = '' then return null; end if;

  -- Con código de país explícito.
  if left(d, 2) = '51' and length(d) between 11 and 14 then return '51' || right(d, 9); end if;
  if left(d, 2) = '58' and length(d) between 12 and 15 then return '58' || right(d, 10); end if;
  if left(d, 2) = '57' and length(d) between 12 and 15 then return '57' || right(d, 10); end if;
  if left(d, 2) = '56' and length(d) between 11 and 14 then return '56' || right(d, 9); end if;

  -- Local con 0 de troncal: VE 0XXXXXXXXXX (11) / PE 0XXXXXXXXX (10).
  if left(d, 1) = '0' and length(d) = 11 then return '58' || substr(d, 2); end if;
  if left(d, 1) = '0' and length(d) = 10 then return '51' || substr(d, 2); end if;

  -- Sin 0 ni código: PE celular 9XXXXXXXX (9) / VE 4XXXXXXXXX (10) /
  -- CO móvil 3XXXXXXXXX (10). (Chile exige escribir +56: sus móviles de
  -- 9 dígitos chocan con los de Perú.)
  if left(d, 1) = '9' and length(d) = 9  then return '51' || d; end if;
  if left(d, 1) = '4' and length(d) = 10 then return '58' || d; end if;
  if left(d, 1) = '3' and length(d) = 10 then return '57' || d; end if;

  -- Otro país: se exige que ya venga completo con su código.
  if length(d) between 11 and 15 then return d; end if;
  return null;
end;
$$;

-- 6) Prospectos: el campo país acepta también los nuevos orígenes.
alter table prospectos drop constraint if exists prospectos_pais_check;
alter table prospectos add constraint prospectos_pais_check
  check (pais in ('peru', 'colombia', 'chile', 'venezuela', 'ambos'));
