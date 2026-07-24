-- Antes: cualquier operador (o cualquier autenticado, según la policy)
-- veía usuarios de CUALQUIER negocio. En un sistema multi-tenant real eso
-- es una fuga entre negocios que compiten entre sí.
drop policy "usuarios: operadores ven todas las filas" on usuarios;
drop policy "usuarios: cualquiera ve datos básicos de operadores" on usuarios;

create policy "usuarios: acceso dentro del mismo negocio o admin"
  on usuarios for select using (
    rol_actual() = 'administrador'
    or id = mi_negocio_operador_peru_id()
    or negocio_operador_peru_id = mi_negocio_operador_peru_id()
  );
