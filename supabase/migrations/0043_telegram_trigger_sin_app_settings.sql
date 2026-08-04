-- Backfill: aplicada en producción el 2026-07-28 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- El trigger dependía de app.settings.edge_function_base_url /
-- app.settings.service_role_key (alter database ... set), pero ese GUC
-- nunca se configuró en este proyecto y ni siquiera el rol usado por el
-- SQL Editor/MCP tiene permiso para setearlo (Supabase lo reserva a
-- superusuario). Por eso el trigger corría, veía base_url = null, y
-- retornaba sin llamar nunca a la Edge Function -- de ahí que no llegara
-- ningún mensaje de Telegram pese a que el depósito sí se validó.
--
-- Solución: hardcodear la URL del proyecto (no es secreta) y usar la
-- anon key como Authorization (tampoco es secreta -- es la misma que ya
-- viaja en el bundle público de la app en EXPO_PUBLIC_SUPABASE_ANON_KEY).
-- La Edge Function igual arma su propio cliente con SUPABASE_SERVICE_ROLE_KEY
-- desde su variable de entorno (ver supabase/functions/_shared/supabaseAdmin.ts),
-- así que no se pierde ningún privilegio: el header entrante solo sirve
-- para pasar la verificación de JWT de la puerta de entrada de Supabase.

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

  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;
