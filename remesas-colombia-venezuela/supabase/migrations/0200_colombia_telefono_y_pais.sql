-- REMESAS COLOMBIA-VENEZUELA: ajustes propios de este corredor sobre el
-- esquema heredado de Perú-Venezuela (que se mantiene tal cual: los
-- nombres internos `operador_peru`, `monto_pen`, `tasa_pen_ves`, `peru`...
-- ahora significan "país de recepción" = Colombia y su moneda COP).
--
-- 1) Teléfonos: Colombia (+57, 10 dígitos, móvil 3XXXXXXXXX) y Venezuela
--    (+58, 10 dígitos, 4XXXXXXXXX). Misma lógica tolerante de 0099.
create or replace function normalizar_telefono_e164(p_tel text) returns text
language plpgsql immutable as $$
declare d text;
begin
  if p_tel is null then return null; end if;
  d := regexp_replace(p_tel, '\D', '', 'g');
  if d = '' then return null; end if;

  -- Con código de país explícito: 57 + 10 (CO) o 58 + 10 (VE).
  if left(d, 2) = '57' and length(d) between 12 and 15 then return '57' || right(d, 10); end if;
  if left(d, 2) = '58' and length(d) between 12 and 15 then return '58' || right(d, 10); end if;

  -- Local venezolano con 0 de troncal: 0XXXXXXXXXX (11).
  if left(d, 1) = '0' and length(d) = 11 then return '58' || substr(d, 2); end if;

  -- Sin código: CO móvil 3XXXXXXXXX (10) / VE 4XXXXXXXXX (10).
  if left(d, 1) = '3' and length(d) = 10 then return '57' || d; end if;
  if left(d, 1) = '4' and length(d) = 10 then return '58' || d; end if;

  -- Otro país: se exige que ya venga completo con su código.
  if length(d) between 11 and 15 then return d; end if;
  return null;
end;
$$;

-- 2) Prospectos de la landing: 'peru' pasa a significar Colombia en este
--    corredor; se acepta también 'colombia' por claridad.
alter table prospectos drop constraint if exists prospectos_pais_check;
alter table prospectos add constraint prospectos_pais_check
  check (pais in ('peru', 'colombia', 'venezuela', 'ambos'));
