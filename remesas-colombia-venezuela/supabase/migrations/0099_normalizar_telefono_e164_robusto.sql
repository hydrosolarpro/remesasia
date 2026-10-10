-- Normalización de teléfono más tolerante: la causa más común de "no
-- entra con el PIN" es que el número tecleado al ingresar no normaliza
-- igual que el guardado (trunk 0, código de país repetido, espacios).
-- Ahora, para Perú (+51) y Venezuela (+58) se toma SIEMPRE la cola de
-- dígitos del abonado (9 en PE, 10 en VE), sin importar 0s o prefijos
-- sobrantes al inicio.
create or replace function normalizar_telefono_e164(p_tel text) returns text
language plpgsql immutable as $$
declare d text;
begin
  if p_tel is null then return null; end if;
  d := regexp_replace(p_tel, '\D', '', 'g');
  if d = '' then return null; end if;

  -- Con código de país explícito: normaliza a 51 + 9 (PE) o 58 + 10 (VE),
  -- descartando cualquier 0 de troncal o dígito sobrante al inicio.
  if left(d, 2) = '51' and length(d) between 11 and 14 then return '51' || right(d, 9); end if;
  if left(d, 2) = '58' and length(d) between 12 and 15 then return '58' || right(d, 10); end if;

  -- Local con 0 de troncal: VE 0XXXXXXXXXX (11) / PE 0XXXXXXXXX (10).
  if left(d, 1) = '0' and length(d) = 11 then return '58' || substr(d, 2); end if;
  if left(d, 1) = '0' and length(d) = 10 then return '51' || substr(d, 2); end if;

  -- Sin 0 ni código: PE celular 9XXXXXXXX (9) / VE 4XXXXXXXXX (10).
  if left(d, 1) = '9' and length(d) = 9  then return '51' || d; end if;
  if left(d, 1) = '4' and length(d) = 10 then return '58' || d; end if;

  -- Otro país: se exige que ya venga completo con su código.
  if length(d) between 11 and 15 then return d; end if;
  return null;
end;
$$;
