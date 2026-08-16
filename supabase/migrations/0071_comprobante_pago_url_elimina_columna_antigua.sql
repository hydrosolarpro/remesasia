-- Ya migrados los datos a comprobante_pago_urls (ver migración anterior) y
-- ningún código sigue leyendo/escribiendo esta columna: se elimina para no
-- dejar una fuente de datos muerta/duplicada.
alter table solicitudes drop column comprobante_pago_url;
