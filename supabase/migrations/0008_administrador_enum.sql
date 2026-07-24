-- Rol administrador (solo ve la lista de Operadores Perú con sus datos de
-- contacto, ver README y (admin)/index.tsx). Postgres exige que un valor
-- nuevo de enum esté comprometido en su propia transacción antes de poder
-- usarse — por eso esto va en un archivo aparte de 0009.
alter type rol add value 'administrador';
