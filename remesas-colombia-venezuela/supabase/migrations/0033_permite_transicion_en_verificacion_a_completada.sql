-- Backfill: aplicada en producción el 2026-07-27 sin commitear el archivo.
-- Contenido tomado verbatim de supabase_migrations.schema_migrations.

-- Bug real (no de esta sesión, ya venía así): la app siempre crea las
-- solicitudes en estado 'EN_VERIFICACION' y nunca pasa por 'PENDIENTE' ni
-- 'FONDOS_VERIFICADOS' (esos son estados de un diseño anterior a los
-- checks check_deposito_peru/check_deposito_ve, que ya no se usan en el
-- flujo real). Al marcar el check de Venezuela,
-- sincronizar_estado_por_checks intenta pasar el estado directo de
-- EN_VERIFICACION a COMPLETADA, pero validar_transicion_estado no
-- contemplaba ese salto y lo rechazaba ("Transición de estado inválida:
-- EN_VERIFICACION -> COMPLETADA") — el check nunca llegaba a marcarse en
-- verde, aunque la imagen sí se subiera bien.
create or replace function validar_transicion_estado() returns trigger
language plpgsql as $$
declare
  transiciones_validas estado_solicitud[];
begin
  if new.estado = old.estado then
    return new;
  end if;

  transiciones_validas := case old.estado
    when 'BORRADOR' then array['PENDIENTE']::estado_solicitud[]
    when 'PENDIENTE' then array['EN_VERIFICACION', 'CANCELADA']::estado_solicitud[]
    when 'EN_VERIFICACION' then array['FONDOS_VERIFICADOS', 'COMPLETADA', 'RECHAZADA', 'CANCELADA']::estado_solicitud[]
    when 'FONDOS_VERIFICADOS' then array['EN_PROCESO', 'COMPLETADA', 'CANCELADA']::estado_solicitud[]
    when 'EN_PROCESO' then array['COMPLETADA', 'CANCELADA']::estado_solicitud[]
    else array[]::estado_solicitud[]
  end;

  if not (new.estado = any (transiciones_validas)) then
    raise exception 'Transición de estado inválida: % -> %', old.estado, new.estado;
  end if;

  return new;
end;
$$;
