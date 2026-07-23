-- Bucket de comprobantes (F4 pago cliente, F7 comprobante VZ, F9 PDF generado).
-- Público de solo-lectura por URL firmable simple; escritura restringida por policy.

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

create policy "comprobantes: lectura pública"
  on storage.objects for select
  using (bucket_id = 'comprobantes');

create policy "comprobantes: cliente sube su propio comprobante de pago"
  on storage.objects for insert
  with check (
    bucket_id = 'comprobantes'
    and rol_actual() = 'cliente'
    and (storage.foldername(name))[1] in (
      select id::text from solicitudes where cliente_id = auth.uid()
    )
  );

create policy "comprobantes: operadores suben comprobante VZ / comprobante PDF"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes' and rol_actual() in ('operador_peru', 'operador_venezuela'));

create policy "comprobantes: operadores actualizan cualquier archivo"
  on storage.objects for update
  using (bucket_id = 'comprobantes' and rol_actual() in ('operador_peru', 'operador_venezuela'));
