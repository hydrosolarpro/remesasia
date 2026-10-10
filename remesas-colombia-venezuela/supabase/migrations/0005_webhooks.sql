-- F8/F9 — Dispara las Edge Functions cuando cambia el estado de una solicitud:
--   1) notificar-cambio-estado  -> push FCM al cliente y/o operadores
--   2) generar-comprobante      -> solo al llegar a COMPLETADA
--
-- Requiere `pg_net` (ya habilitado en proyectos Supabase hospedados) y dos
-- ajustes a nivel de base de datos que debes configurar una sola vez desde
-- el SQL Editor del dashboard (no van en el repo por ser secretos/URLs del proyecto):
--
--   alter database postgres set app.settings.edge_function_base_url =
--     'https://vddyynachdgqmtofqxnr.supabase.co/functions/v1';
--   alter database postgres set app.settings.service_role_key = '<service_role_key>';
--
-- Ver README.md -> "Configurar webhooks de estado" para el paso a paso.

create extension if not exists pg_net;

create function notificar_y_generar_comprobante() returns trigger as $$
declare
  base_url text := current_setting('app.settings.edge_function_base_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
begin
  if new.estado is distinct from old.estado and base_url is not null then
    perform net.http_post(
      url := base_url || '/notificar-cambio-estado',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
      body := jsonb_build_object(
        'solicitud_id', new.id,
        'estado_anterior', old.estado,
        'estado_nuevo', new.estado
      )
    );

    if new.estado = 'COMPLETADA' then
      perform net.http_post(
        url := base_url || '/generar-comprobante',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_key),
        body := jsonb_build_object('solicitud_id', new.id)
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notificar_y_generar_comprobante
  after update on solicitudes
  for each row execute function notificar_y_generar_comprobante();
