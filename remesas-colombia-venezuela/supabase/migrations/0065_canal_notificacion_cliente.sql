-- Preferencia de canal de notificación del cliente (Telegram, WhatsApp o
-- ambos), elegida desde su Perfil. Hasta ahora las notificaciones de
-- depósito validado solo llegaban por Telegram (si estaba conectado, ver
-- 0040_telegram_notificaciones.sql) sin que el cliente pudiera elegir ni
-- hubiera respaldo alguno si no había conectado Telegram. 'ambos' por
-- defecto para no perder avisos de clientes existentes que aún no
-- eligieron nada.
alter table usuarios
  add column if not exists canal_notificacion text not null default 'ambos'
    check (canal_notificacion in ('telegram', 'whatsapp', 'ambos'));
