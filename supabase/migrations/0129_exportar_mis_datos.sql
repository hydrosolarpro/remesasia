-- ─────────────────────────────────────────────────────────────
-- 0129 — Derecho de acceso (Ley 29733): "Descargar mis datos".
--
-- Devuelve en un JSON todos los datos personales de quien llama (cuenta,
-- solicitudes como cliente, beneficiarios y cuentas guardadas, tasas
-- especiales y, si es operador, sus filas de equipo). Solo lee datos del
-- propio auth.uid().
--
-- De las solicitudes se EXCLUYEN a propósito los campos internos del
-- negocio (tasa_real_compra, comisiones aplicadas, validadores): no son
-- datos personales del cliente y revelarían el margen del operador.
-- No se exporta el push_token (es un identificador técnico del dispositivo).
-- ─────────────────────────────────────────────────────────────
create or replace function exportar_mis_datos()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  return jsonb_build_object(
    'generado_el', now(),
    'cuenta', (select to_jsonb(u) - 'push_token' from usuarios u where u.id = v_uid),
    'solicitudes_como_cliente', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'fecha', s.created_at,
        'estado', s.estado,
        'corredor', s.corredor,
        'monto_pen', s.monto_pen,
        'monto_ves', s.monto_ves,
        'tasa_pen_ves', s.tasa_pen_ves,
        'tipo_transferencia', s.tipo_transferencia,
        'metodo_pago', s.metodo_pago,
        'beneficiario_nombre', s.beneficiario_nombre,
        'beneficiario_ci', s.beneficiario_ci,
        'beneficiario_telefono', s.beneficiario_telefono,
        'beneficiario_banco', s.beneficiario_banco,
        'beneficiario_cuenta', s.beneficiario_cuenta,
        'motivo_rechazo', s.motivo_rechazo,
        'comprobantes_de_pago', s.comprobante_pago_urls,
        'comprobantes_de_deposito', s.comprobante_vz_urls
      ) order by s.created_at)
      from solicitudes s where s.cliente_id = v_uid
    ), '[]'::jsonb),
    'beneficiarios_guardados', coalesce((
      select jsonb_agg(to_jsonb(b) || jsonb_build_object('cuentas', coalesce((
        select jsonb_agg(to_jsonb(c)) from beneficiario_cuentas_bancarias c where c.beneficiario_id = b.id
      ), '[]'::jsonb)))
      from beneficiarios_cliente b where b.cliente_id = v_uid
    ), '[]'::jsonb),
    'cuentas_utilizadas', coalesce((
      select jsonb_agg(to_jsonb(c)) from cuentas_utilizadas_cliente c where c.cliente_id = v_uid
    ), '[]'::jsonb),
    'tasas_especiales', coalesce((
      select jsonb_agg(to_jsonb(t)) from tasas_cliente t where t.cliente_id = v_uid
    ), '[]'::jsonb),
    'como_miembro_de_equipo_peru', coalesce((
      select jsonb_agg(to_jsonb(m)) from operador_peru_miembro m where m.usuario_id = v_uid
    ), '[]'::jsonb),
    'como_operador_venezuela', coalesce((
      select jsonb_agg(to_jsonb(v)) from operador_venezuela_perfil v where v.usuario_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function exportar_mis_datos() from public, anon;
grant execute on function exportar_mis_datos() to authenticated;
