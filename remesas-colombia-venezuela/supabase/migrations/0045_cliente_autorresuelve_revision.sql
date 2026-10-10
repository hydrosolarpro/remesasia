-- Además de que un operador resuelva "Operaciones por revisar", el propio
-- cliente puede confirmar que ya verificó en cuenta y el depósito sí llegó
-- (p.ej. tardó en reflejarse). Esto avisa a los operadores (la solicitud
-- desaparece de "Operaciones por revisar" en su panel) y marca
-- automáticamente el check de "resuelto", igual que si lo hubiera hecho un
-- operador -- por eso se reutiliza la misma función en vez de duplicarla.

create or replace function resolver_revision_beneficiario(p_solicitud_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update solicitudes
    set en_revision = false,
        revision_resuelta_at = now(),
        revision_resuelta_por = auth.uid(),
        check_beneficiario_confirmado = true,
        check_beneficiario_confirmado_at = now()
    where id = p_solicitud_id
      and en_revision = true
      and (
        cliente_id = auth.uid()
        or (
          rol_actual() in ('operador_peru', 'operador_peru_miembro', 'operador_venezuela')
          and negocio_operador_peru_id = mi_negocio_operador_peru_id()
        )
      );
end;
$$;
