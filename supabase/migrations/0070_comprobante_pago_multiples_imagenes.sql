-- El cliente puede subir varias imágenes de comprobante de depósito (antes
-- solo 1) -- se agrega un array y se migran los datos existentes; el RPC
-- de limpieza de solicitudes huérfanas (cancelar_solicitud_fallida) pasa a
-- revisar el array en vez de la columna singular. La columna antigua
-- (comprobante_pago_url) se deja intacta por ahora, sin usarse.

alter table solicitudes add column comprobante_pago_urls text[] not null default '{}';

update solicitudes
  set comprobante_pago_urls = array[comprobante_pago_url]
  where comprobante_pago_url is not null and comprobante_pago_url <> '';

create or replace function cancelar_solicitud_fallida(p_solicitud_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from solicitudes
    where id = p_solicitud_id
      and cliente_id = auth.uid()
      and comprobante_pago_urls = '{}';
end;
$$;
