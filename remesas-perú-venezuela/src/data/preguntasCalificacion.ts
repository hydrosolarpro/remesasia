export type OperaActualmente = 'ya_opero' | 'quiero_empezar' | 'solo_investigando';
export type VolumenMensual = 'menos_20' | '20_100' | '100_300' | 'mas_300';
export type TieneEquipo = 'con_equipo' | 'solo' | 'sin_equipo';
export type Urgencia = 'esta_semana' | 'este_mes' | 'explorando';

export interface OpcionPregunta<T extends string> {
  value: T;
  label: string;
}

// El mismo orden de campos que espera el RPC registrar_prospecto()
// (supabase/migrations/0074_prospectos_crm.sql) -- ahí vive el puntaje real
// de cada opción, este archivo solo define qué ve/elige el visitante.
export const PREGUNTA_OPERA_ACTUALMENTE: OpcionPregunta<OperaActualmente>[] = [
  { value: 'ya_opero', label: 'Ya opero un negocio de remesas Perú-Venezuela' },
  { value: 'quiero_empezar', label: 'Quiero empezar uno' },
  { value: 'solo_investigando', label: 'Solo estoy investigando por ahora' },
];

export const PREGUNTA_VOLUMEN_MENSUAL: OpcionPregunta<VolumenMensual>[] = [
  { value: 'menos_20', label: 'Menos de 20 clientes/envíos al mes' },
  { value: '20_100', label: 'Entre 20 y 100 al mes' },
  { value: '100_300', label: 'Entre 100 y 300 al mes' },
  { value: 'mas_300', label: 'Más de 300 al mes' },
];

export const PREGUNTA_TIENE_EQUIPO: OpcionPregunta<TieneEquipo>[] = [
  { value: 'con_equipo', label: 'Sí, tengo equipo en Perú y/o Venezuela' },
  { value: 'solo', label: 'Por ahora trabajo solo' },
  { value: 'sin_equipo', label: 'Todavía no tengo equipo' },
];

export const PREGUNTA_URGENCIA: OpcionPregunta<Urgencia>[] = [
  { value: 'esta_semana', label: 'Quiero empezar esta semana' },
  { value: 'este_mes', label: 'En las próximas semanas, este mes' },
  { value: 'explorando', label: 'Solo estoy explorando opciones' },
];
