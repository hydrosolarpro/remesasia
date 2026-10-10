-- Plan DEMO (gratis, 15 días) vs STARTER (pagado, ver lib/plan.ts) para
-- Operador Perú. `demo_inicio` marca el arranque de la cuenta regresiva;
-- se setea en canjear_invitacion() al promover a operador_peru. Las cuentas
-- de operador_peru que ya existían también entran a DEMO desde ahora.
alter table usuarios add column plan text not null default 'demo' check (plan in ('demo', 'starter'));
alter table usuarios add column demo_inicio timestamptz;

update usuarios set demo_inicio = now() where rol = 'operador_peru';

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
    update usuarios set rol = 'operador_peru', acceso_concedido = false, demo_inicio = now() where id = auth.uid();
  else
    update usuarios
      set rol = 'cliente', negocio_operador_peru_id = inv.negocio_operador_peru_id
      where id = auth.uid();
  end if;

  update invitaciones set usado_por = auth.uid(), used_at = now() where id = inv.id;

  return jsonb_build_object('ok', true, 'tipo', inv.tipo);
end;
$$;
