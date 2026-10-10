-- El trigger notificar_y_generar_comprobante() (0005_webhooks.sql) dependía
-- de app.settings.edge_function_base_url / app.settings.service_role_key
-- (alter database ... set), que -- igual que ya se documentó y corrigió
-- para el trigger de Telegram en 0043_telegram_trigger_sin_app_settings.sql
-- -- nunca se configuraron en este proyecto (Supabase reserva ese ajuste a
-- superusuario, el SQL Editor/MCP no tiene permiso). Confirmado en vivo:
-- current_setting('app.settings.edge_function_base_url', true) devuelve
-- NULL, así que el trigger corría, veía base_url = null, y retornaba sin
-- llamar nunca a ninguna Edge Function.
--
-- Efecto real en producción: "generar-comprobante" (el PDF del
-- comprobante) NUNCA se generó para ninguna de las operaciones ya
-- completadas (verificado: 28 solicitudes en estado COMPLETADA, las 28
-- con comprobante_pdf_url en NULL) -- el botón "Descargar comprobante PDF"
-- en (cliente)/solicitud/[id].tsx nunca tuvo nada que mostrar. Tampoco se
-- disparó nunca "notificar-cambio-estado" (push FCM).
--
-- Misma solución que 0043: hardcodear la URL del proyecto (no es secreta) y
-- usar la anon key como Authorization (tampoco es secreta -- ya viaja en el
-- bundle público de la app). Cada Edge Function arma su propio cliente con
-- SUPABASE_SERVICE_ROLE_KEY desde su variable de entorno (ver
-- supabase/functions/_shared/supabaseAdmin.ts), así que no se pierde
-- ningún privilegio.
--
-- La plantilla del PDF (supabase/functions/generar-comprobante/index.ts)
-- también se corrigió en este mismo cambio: usaba campos del modelo de
-- tasas viejo (tasa_pen_usdt, monto_usdt, tasa_usdt_ves) que ya no existen
-- en `solicitudes` desde que el modelo pasó a tasa_pen_ves directa
-- (0027_tasa_directa_pen_ves.sql) -- de haber reactivado el trigger sin
-- corregir eso, habría generado PDFs con "undefined" en vez de silencio.

create or replace function notificar_y_generar_comprobante() returns trigger as $$
declare
  base_url constant text := 'https://vddyynachdgqmtofqxnr.supabase.co/functions/v1';
  anon_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZHl5bmFjaGRncW10b2ZxeG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MzcxMzAsImV4cCI6MjEwMDQxMzEzMH0.mV8Sya0UQFAyky7xSI6z_iJbOBlZn8uySX1jI5FO0Sk';
begin
  if new.estado is distinct from old.estado then
    perform net.http_post(
      url := base_url || '/notificar-cambio-estado',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object(
        'solicitud_id', new.id,
        'estado_anterior', old.estado,
        'estado_nuevo', new.estado
      )
    );

    if new.estado = 'COMPLETADA' then
      perform net.http_post(
        url := base_url || '/generar-comprobante',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
        body := jsonb_build_object('solicitud_id', new.id)
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;
