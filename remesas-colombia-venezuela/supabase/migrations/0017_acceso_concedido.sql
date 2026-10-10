-- Segundo candado independiente del pago: el admin debe conceder el
-- acceso explícitamente, aparte de validar el pago (dos checks separados
-- en el panel de control). Default true para no afectar cuentas ya
-- existentes (promovidas antes de esta función).
alter table usuarios add column acceso_concedido boolean not null default true;

create or replace function canjear_invitacion(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv invitaciones;
begin
  select * into inv from invitaciones where token = p_token and usado_por is null;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invitación inválida o ya usada.');
  end if;

  if inv.tipo = 'operador_peru' then
    update usuarios set rol = 'operador_peru', acceso_concedido = false where id = auth.uid();
  else
    update usuarios
      set rol = 'cliente', negocio_operador_peru_id = inv.negocio_operador_peru_id
      where id = auth.uid();
  end if;

  update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;
