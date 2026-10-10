-- Paso de verificación final del flujo: el cliente confirma si el depósito
-- realmente llegó a la cuenta del beneficiario en Venezuela (algo que los
-- operadores no pueden verificar directamente). Si no llegó, la solicitud
-- se escala a "Operaciones por revisar" en el panel de los operadores
-- (Perú y Venezuela); al resolverse, se avisa por Telegram a ambos y se
-- marca automáticamente como confirmado del lado del cliente.

alter table solicitudes add column check_beneficiario_confirmado boolean not null default false;
alter table solicitudes add column check_beneficiario_confirmado_at timestamptz;
alter table solicitudes add column en_revision boolean not null default false;
alter table solicitudes add column en_revision_at timestamptz;
alter table solicitudes add column revision_resuelta_at timestamptz;
alter table solicitudes add column revision_resuelta_por uuid references usuarios(id);

-- El cliente confirma que el depósito sí llegó a la cuenta del beneficiario.
create function confirmar_beneficiario_recibido(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update solicitudes
    set check_beneficiario_confirmado = true, check_beneficiario_confirmado_at = now()
    where id = p_solicitud_id
      and cliente_id = auth.uid()
      and check_deposito_ve = true
      and en_revision = false;
end;
$$;

-- El cliente reporta que el depósito NO llegó -- esto escala la solicitud a
-- "Operaciones por revisar" en el panel de los operadores.
create function reportar_beneficiario_no_recibido(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update solicitudes
    set en_revision = true, en_revision_at = now(), revision_resuelta_at = null, revision_resuelta_por = null
    where id = p_solicitud_id
      and cliente_id = auth.uid()
      and check_deposito_ve = true
      and check_beneficiario_confirmado = false;
end;
$$;

-- Cualquier operador del negocio (Perú dueño/miembro o Venezuela) marca el
-- caso como resuelto: cierra la revisión y confirma automáticamente el
-- check del lado del cliente, ya que el problema quedó solucionado.
create function resolver_revision_beneficiario(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if rol_actual() not in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela') then
    raise exception 'Solo un operador puede resolver esta revisión';
  end if;

  update solicitudes
    set en_revision = false,
        revision_resuelta_at = now(),
        revision_resuelta_por = auth.uid(),
        check_beneficiario_confirmado = true,
        check_beneficiario_confirmado_at = now()
    where id = p_solicitud_id
      and negocio_operador_peru_id = mi_negocio_operador_peru_id()
      and en_revision = true;
end;
$$;

grant execute on function confirmar_beneficiario_recibido(uuid) to authenticated;
grant execute on function reportar_beneficiario_no_recibido(uuid) to authenticated;
grant execute on function resolver_revision_beneficiario(uuid) to authenticated;

-- Extiende el trigger de Telegram ya existente (ver
-- 0043_telegram_trigger_sin_app_settings.sql) con un tercer aviso: cuando
-- se resuelve una revisión, se notifica tanto al cliente como al
-- beneficiario con el mismo mensaje.
create or replace function telegram_notificar_deposito() returns trigger as $$
declare
  base_url constant text := 'https://vddyynachdgqmtofqxnr.supabase.co/functions/v1';
  anon_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZHl5bmFjaGRncW10b2ZxeG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MzcxMzAsImV4cCI6MjEwMDQxMzEzMH0.mV8Sya0UQFAyky7xSI6z_iJbOBlZn8uySX1jI5FO0Sk';
begin
  if new.check_deposito_peru and old.check_deposito_peru is distinct from new.check_deposito_peru then
    perform net.http_post(
      url := base_url || '/telegram-notificar-deposito',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object('solicitud_id', new.id, 'tipo', 'peru')
    );
  end if;

  if new.check_deposito_ve and old.check_deposito_ve is distinct from new.check_deposito_ve then
    perform net.http_post(
      url := base_url || '/telegram-notificar-deposito',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object('solicitud_id', new.id, 'tipo', 'venezuela')
    );
  end if;

  if new.revision_resuelta_at is not null and old.revision_resuelta_at is distinct from new.revision_resuelta_at then
    perform net.http_post(
      url := base_url || '/telegram-notificar-deposito',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object('solicitud_id', new.id, 'tipo', 'revision_resuelta')
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;
