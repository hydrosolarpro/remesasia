-- Fix de 0130: el cliente crea la solicitud directo en EN_VERIFICACION (nunca
-- en PENDIENTE), asi que el trigger no se disparaba. Ahora avisa al entrar a
-- cualquiera de los dos estados iniciales.

create or replace function telegram_notificar_solicitud() returns trigger as $$
declare
  base_url constant text := 'https://vddyynachdgqmtofqxnr.supabase.co/functions/v1';
  anon_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZHl5bmFjaGRncW10b2ZxeG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MzcxMzAsImV4cCI6MjEwMDQxMzEzMH0.mV8Sya0UQFAyky7xSI6z_iJbOBlZn8uySX1jI5FO0Sk';
begin
  if new.estado in ('PENDIENTE', 'EN_VERIFICACION')
     and (tg_op = 'INSERT' or old.estado is distinct from new.estado)
     and (tg_op = 'INSERT' or old.estado in ('BORRADOR', 'PENDIENTE')) then
    perform net.http_post(
      url := base_url || '/telegram-notificar-solicitud',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object('solicitud_id', new.id)
    );
  end if;
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;
