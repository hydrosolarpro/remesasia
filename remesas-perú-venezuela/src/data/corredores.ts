// Corredores de remesas de Remesas IA: país de recepción -> Venezuela.
// Una sola plataforma y una sola cuenta: el negocio activa los corredores con
// los que trabaja y fija su sede principal (ver app, Perfil → Corredores).
// Las tasas de esta landing son DEMOSTRATIVAS (el operador publica la suya
// cada día dentro de la plataforma).

export type CorredorId = 'PE-VE' | 'CO-VE' | 'CL-VE' | 'OT-VE';

export interface Corredor {
  id: CorredorId;
  /** Nombre corto del país de recepción. */
  pais: string;
  /** "Perú → Venezuela" */
  nombre: string;
  /** Gentilicio para textos ("banca peruana"). */
  banca: string;
  monedaCodigo: string;
  monedaNombre: string;
  simbolo: string;
  /** Unidades de VES por 1 unidad de la moneda de recepción (demo). */
  tasaDemo: number;
  montosRapidos: number[];
  montoInicial: number;
  billeteras: string[];
  prefijo: string;
  /** Color de acento del corredor (hex). */
  color: string;
}

export const CORREDORES: Corredor[] = [
  {
    id: 'PE-VE',
    pais: 'Perú',
    nombre: 'Perú → Venezuela',
    banca: 'Banca peruana',
    monedaCodigo: 'PEN',
    monedaNombre: 'Soles',
    simbolo: 'S/',
    tasaDemo: 235,
    montosRapidos: [50, 100, 200, 500],
    montoInicial: 100,
    billeteras: ['Yape', 'Plin'],
    prefijo: '+51',
    color: '#3b82f6',
  },
  {
    id: 'CO-VE',
    pais: 'Colombia',
    nombre: 'Colombia → Venezuela',
    banca: 'Banca colombiana',
    monedaCodigo: 'COP',
    monedaNombre: 'Pesos colombianos',
    simbolo: '$',
    tasaDemo: 0.0105,
    montosRapidos: [50000, 100000, 200000, 500000],
    montoInicial: 100000,
    billeteras: ['Nequi', 'Daviplata'],
    prefijo: '+57',
    color: '#facc15',
  },
  {
    id: 'CL-VE',
    pais: 'Chile',
    nombre: 'Chile → Venezuela',
    banca: 'Banca chilena',
    monedaCodigo: 'CLP',
    monedaNombre: 'Pesos chilenos',
    simbolo: '$',
    tasaDemo: 0.04,
    montosRapidos: [20000, 50000, 100000, 200000],
    montoInicial: 50000,
    billeteras: ['Mach', 'Tenpo'],
    prefijo: '+56',
    color: '#ef4444',
  },
  {
    id: 'OT-VE',
    pais: 'Otro país',
    nombre: 'Otro país → Venezuela',
    banca: 'Banca de tu país',
    monedaCodigo: 'USD',
    monedaNombre: 'Moneda de tu país',
    simbolo: '$',
    tasaDemo: 40,
    montosRapidos: [50, 100, 200, 500],
    montoInicial: 100,
    billeteras: ['Tus plataformas de pago'],
    prefijo: '',
    color: '#a78bfa',
  },
];

export const CORREDOR_POR_DEFECTO: CorredorId = 'PE-VE';

export function corredorDe(id: string): Corredor {
  return CORREDORES.find((c) => c.id === id) ?? CORREDORES[0];
}
