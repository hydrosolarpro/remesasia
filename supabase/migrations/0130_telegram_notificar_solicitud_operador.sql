-- Aviso por Telegram a los operadores cuando un cliente genera una solicitud
-- (estado PENDIENTE). Dispara la Edge Function `telegram-notificar-solicitud`
-- con el mismo patron fire-and-forget de `telegram_notificar_deposito`
-- (migracion 0043): URL del proyecto y anon key no son secretos.

create or replace function telegram_notificar_solicitud() returns trigger as $$
declare
  base_url constant text := 'https://vddyynachdgqmtofqxnr.supabase.co/functions/v1';
  anon_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZHl5bmFjaGRncW10b2ZxeG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MzcxMzAsImV4cCI6MjEwMDQxMzEzMH0.mV8Sya0UQFAyky7xSI6z_iJbOBlZn8uySX1jI5FO0Sk';
begin
  if new.estado = 'PENDIENTE' and (tg_op = 'INSERT' or old.estado is distinct from 'PENDIENTE') then
    perform net.http_post(
      url := base_url || '/telegram-notificar-solicitud',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object('solicitud_id', new.id)
    );
  end if;
  return new;
exception when others then
  -- Un fallo de red/pg_net nunca debe impedir que el cliente cree su solicitud.
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

drop trigger if exists trg_telegram_notificar_solicitud on solicitudes;
create trigger trg_telegram_notificar_solicitud
  after insert or update of estado on solicitudes
  for each row execute function telegram_notificar_solicitud();
