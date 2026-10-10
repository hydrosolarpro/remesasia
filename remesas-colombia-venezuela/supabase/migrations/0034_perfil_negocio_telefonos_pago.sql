-- Reemplaza el QR de Yape/Plin por el número de teléfono del operador
-- Perú: en vez de escanear una imagen, el cliente ve el teléfono y lo
-- copia. Se conservan yape_qr_url/plin_qr_url por compatibilidad (dejan
-- de leerse/escribirse desde la app) para no perder datos ya cargados.
alter table perfil_negocio add column yape_telefono text;
alter table perfil_negocio add column plin_telefono text;
