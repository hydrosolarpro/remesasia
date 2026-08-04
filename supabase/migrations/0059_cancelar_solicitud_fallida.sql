-- Backfill: aplicada en producción el 2026-08-01 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Bug: si la creación de una solicitud fallaba DESPUÉS de insertar la fila
-- (p.ej. la subida del comprobante fallaba por una red lenta), la fila ya
-- creada quedaba huérfana (sin comprobante_pago_url) y el cliente, al
-- reintentar con el mismo formulario, generaba OTRA solicitud duplicada.
-- Este RPC permite al propio cliente borrar SOLO su intento fallido (nunca
-- una solicitud ya completa) antes de reintentar.
create or replace function cancelar_solicitud_fallida(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from solicitudes
    where id = p_solicitud_id
      and cliente_id = auth.uid()
      and comprobante_pago_url is null;
end;
$$;

grant execute on function cancelar_solicitud_fallida(uuid) to authenticated;
