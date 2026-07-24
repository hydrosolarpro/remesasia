-- Permite al Operador Perú reenviar su comprobante tras un rechazo
-- (necesario para el upsert on-conflict de pagos_suscripcion en la app).
create policy "pagos_suscripcion: operador_peru reenvía tras rechazo"
  on pagos_suscripcion for update
  using (operador_peru_id = auth.uid() and estado = 'rechazado')
  with check (operador_peru_id = auth.uid() and estado = 'pendiente');
