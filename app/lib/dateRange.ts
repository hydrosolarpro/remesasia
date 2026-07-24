export type ModoFiltroFecha = 'dia' | 'rango_dias' | 'mes' | 'rango_meses' | 'anio' | 'rango_anios';

export interface RangoFecha {
  desde: string; // ISO yyyy-mm-dd, inclusive
  hasta: string; // ISO yyyy-mm-dd, exclusivo (día siguiente al último incluido)
  etiqueta: string;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function primerDiaMes(aaaaMm: string): string {
  return `${aaaaMm}-01`;
}

function primerDiaMesSiguiente(aaaaMm: string): string {
  const [anio, mes] = aaaaMm.split('-').map(Number);
  const d = new Date(Date.UTC(anio, mes, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Calcula el rango [desde, hasta) a partir del modo de filtro y los valores
 * que ingresó el usuario. Usado tanto en estadísticas del operador como del
 * cliente (ver components/DateRangeFilter.tsx).
 */
export function calcularRango(modo: ModoFiltroFecha, a: string, b: string): RangoFecha | null {
  switch (modo) {
    case 'dia':
      if (!a) return null;
      return { desde: a, hasta: sumarDias(a, 1), etiqueta: a };
    case 'rango_dias':
      if (!a || !b) return null;
      return { desde: a, hasta: sumarDias(b, 1), etiqueta: `${a} → ${b}` };
    case 'mes': {
      if (!/^\d{4}-\d{2}$/.test(a)) return null;
      const [, mesNum] = a.split('-');
      return { desde: primerDiaMes(a), hasta: primerDiaMesSiguiente(a), etiqueta: `${MESES[Number(mesNum) - 1]} ${a.slice(0, 4)}` };
    }
    case 'rango_meses':
      if (!/^\d{4}-\d{2}$/.test(a) || !/^\d{4}-\d{2}$/.test(b)) return null;
      return { desde: primerDiaMes(a), hasta: primerDiaMesSiguiente(b), etiqueta: `${a} → ${b}` };
    case 'anio':
      if (!/^\d{4}$/.test(a)) return null;
      return { desde: `${a}-01-01`, hasta: `${Number(a) + 1}-01-01`, etiqueta: a };
    case 'rango_anios':
      if (!/^\d{4}$/.test(a) || !/^\d{4}$/.test(b)) return null;
      return { desde: `${a}-01-01`, hasta: `${Number(b) + 1}-01-01`, etiqueta: `${a} → ${b}` };
    default:
      return null;
  }
}

export const ETIQUETAS_MODO: Record<ModoFiltroFecha, string> = {
  dia: 'Fecha específica',
  rango_dias: 'Rango de fechas',
  mes: 'Mes',
  rango_meses: 'Rango de meses',
  anio: 'Año',
  rango_anios: 'Rango de años',
};
