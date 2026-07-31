import { supabase } from './supabase';
import { Usuario } from '../types/database';

// Resuelve el contexto de la sesión actual del operador según su rol:
//
//   * operador_peru           -> "Operador principal de Perú" (dueño del negocio)
//   * operador_peru_miembro   -> "Operador de Perú miembro" (equipo del principal)
//   * operador_venezuela      -> "Operador de Venezuela"
//
// El `negocioId` es siempre el id del Operador principal (dueño), que es
// quien define la tasa, el perfil del negocio, etc. `miembroId`/`veId` son
// los ids de la fila de vínculo (operador_peru_miembro / operador_venezuela_perfil)
// de la sesión actual, usados para filtrar las operaciones que le tocan.

export type TipoSesionOperador = 'principal' | 'miembro' | 'venezuela';

export interface ContextoOperador {
  negocioId: string | null;
  tipo: TipoSesionOperador;
  /** Id de la fila `operador_peru_miembro` de la sesión actual (solo tipo 'miembro'). */
  miembroId: string | null;
  /** Id de la fila `operador_venezuela_perfil` de la sesión actual (solo tipo 'venezuela'). */
  veId: string | null;
}

export async function resolverContextoOperador(usuario: Usuario | null): Promise<ContextoOperador> {
  if (!usuario) return { negocioId: null, tipo: 'principal', miembroId: null, veId: null };

  if (usuario.rol === 'operador_peru') {
    return { negocioId: usuario.id, tipo: 'principal', miembroId: null, veId: null };
  }

  if (usuario.rol === 'operador_peru_miembro') {
    const { data } = await supabase
      .from('operador_peru_miembro')
      .select('id, operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle();
    if (data) return { negocioId: data.operador_peru_id, tipo: 'miembro', miembroId: data.id, veId: null };
    return { negocioId: null, tipo: 'miembro', miembroId: null, veId: null };
  }

  // operador_venezuela
  const { data } = await supabase
    .from('operador_venezuela_perfil')
    .select('id, operador_peru_id')
    .eq('usuario_id', usuario.id)
    .maybeSingle();
  if (data) return { negocioId: data.operador_peru_id, tipo: 'venezuela', miembroId: null, veId: data.id };
  return { negocioId: null, tipo: 'venezuela', miembroId: null, veId: null };
}

// Ids de los operadores de Perú miembros asignados a un Operador de
// Venezuela (los que el principal le asignó a ese VE).
export async function obtenerMiembrosAsignadosAlVe(veId: string): Promise<string[]> {
  const { data } = await supabase
    .from('operador_peru_miembro')
    .select('id')
    .eq('operador_venezuela_id', veId);
  return (data ?? []).map((m) => m.id as string);
}

export function etiquetaSesion(tipo: TipoSesionOperador): string {
  switch (tipo) {
    case 'principal':
      return 'Operador principal de Perú';
    case 'miembro':
      return 'Operador de Perú miembro';
    case 'venezuela':
      return 'Operador de Venezuela';
  }
}
