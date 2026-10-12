// Catálogo de países para el corredor "Otro país → Venezuela": el Operador
// principal escribe/elige el país y la moneda, el símbolo y el prefijo
// telefónico se completan solos. Si su país no está en la lista, puede
// escribir esos datos a mano (ver CorredoresNegocio).

export interface Moneda {
  codigo: string;
  /** Plural, para títulos y textos: "Pesos argentinos". */
  nombre: string;
  /** Singular, para frases como "cada peso argentino". */
  unidad: string;
  simbolo: string;
}

export interface Pais {
  nombre: string;
  moneda: string; // código ISO, clave de MONEDAS
  prefijo: string; // sin "+"
}

export const MONEDAS: Record<string, Moneda> = {
  PEN: { codigo: 'PEN', nombre: 'Soles', unidad: 'sol', simbolo: 'S/' },
  COP: { codigo: 'COP', nombre: 'Pesos colombianos', unidad: 'peso colombiano', simbolo: '$' },
  CLP: { codigo: 'CLP', nombre: 'Pesos chilenos', unidad: 'peso chileno', simbolo: '$' },
  ARS: { codigo: 'ARS', nombre: 'Pesos argentinos', unidad: 'peso argentino', simbolo: '$' },
  BOB: { codigo: 'BOB', nombre: 'Bolivianos', unidad: 'boliviano', simbolo: 'Bs' },
  MXN: { codigo: 'MXN', nombre: 'Pesos mexicanos', unidad: 'peso mexicano', simbolo: '$' },
  USD: { codigo: 'USD', nombre: 'Dólares', unidad: 'dólar', simbolo: '$' },
  EUR: { codigo: 'EUR', nombre: 'Euros', unidad: 'euro', simbolo: '€' },
  GTQ: { codigo: 'GTQ', nombre: 'Quetzales', unidad: 'quetzal', simbolo: 'Q' },
  HNL: { codigo: 'HNL', nombre: 'Lempiras', unidad: 'lempira', simbolo: 'L' },
  NIO: { codigo: 'NIO', nombre: 'Córdobas', unidad: 'córdoba', simbolo: 'C$' },
  CRC: { codigo: 'CRC', nombre: 'Colones', unidad: 'colón', simbolo: '₡' },
  BZD: { codigo: 'BZD', nombre: 'Dólares beliceños', unidad: 'dólar beliceño', simbolo: 'BZ$' },
  UYU: { codigo: 'UYU', nombre: 'Pesos uruguayos', unidad: 'peso uruguayo', simbolo: '$U' },
  PYG: { codigo: 'PYG', nombre: 'Guaraníes', unidad: 'guaraní', simbolo: '₲' },
  BRL: { codigo: 'BRL', nombre: 'Reales', unidad: 'real', simbolo: 'R$' },
  DOP: { codigo: 'DOP', nombre: 'Pesos dominicanos', unidad: 'peso dominicano', simbolo: 'RD$' },
  CUP: { codigo: 'CUP', nombre: 'Pesos cubanos', unidad: 'peso cubano', simbolo: '$' },
  GBP: { codigo: 'GBP', nombre: 'Libras', unidad: 'libra', simbolo: '£' },
  CAD: { codigo: 'CAD', nombre: 'Dólares canadienses', unidad: 'dólar canadiense', simbolo: 'CA$' },
  CHF: { codigo: 'CHF', nombre: 'Francos suizos', unidad: 'franco suizo', simbolo: 'CHF' },
};

export const PAISES: Pais[] = [
  { nombre: 'Argentina', moneda: 'ARS', prefijo: '54' },
  { nombre: 'Bolivia', moneda: 'BOB', prefijo: '591' },
  { nombre: 'Ecuador', moneda: 'USD', prefijo: '593' },
  { nombre: 'México', moneda: 'MXN', prefijo: '52' },
  { nombre: 'Panamá', moneda: 'USD', prefijo: '507' },
  { nombre: 'España', moneda: 'EUR', prefijo: '34' },
  // Centroamérica
  { nombre: 'Guatemala', moneda: 'GTQ', prefijo: '502' },
  { nombre: 'Honduras', moneda: 'HNL', prefijo: '504' },
  { nombre: 'El Salvador', moneda: 'USD', prefijo: '503' },
  { nombre: 'Nicaragua', moneda: 'NIO', prefijo: '505' },
  { nombre: 'Costa Rica', moneda: 'CRC', prefijo: '506' },
  { nombre: 'Belice', moneda: 'BZD', prefijo: '501' },
  // Otros destinos frecuentes
  { nombre: 'Uruguay', moneda: 'UYU', prefijo: '598' },
  { nombre: 'Paraguay', moneda: 'PYG', prefijo: '595' },
  { nombre: 'Brasil', moneda: 'BRL', prefijo: '55' },
  { nombre: 'República Dominicana', moneda: 'DOP', prefijo: '1' },
  { nombre: 'Puerto Rico', moneda: 'USD', prefijo: '1' },
  { nombre: 'Cuba', moneda: 'CUP', prefijo: '53' },
  { nombre: 'Estados Unidos', moneda: 'USD', prefijo: '1' },
  { nombre: 'Canadá', moneda: 'CAD', prefijo: '1' },
  { nombre: 'Reino Unido', moneda: 'GBP', prefijo: '44' },
  { nombre: 'Italia', moneda: 'EUR', prefijo: '39' },
  { nombre: 'Portugal', moneda: 'EUR', prefijo: '351' },
  { nombre: 'Francia', moneda: 'EUR', prefijo: '33' },
  { nombre: 'Alemania', moneda: 'EUR', prefijo: '49' },
  { nombre: 'Suiza', moneda: 'CHF', prefijo: '41' },
];

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** País del catálogo cuyo nombre coincide exactamente (sin tildes ni mayúsculas). */
export function buscarPais(texto: string): Pais | undefined {
  const t = normalizar(texto);
  return t ? PAISES.find((p) => normalizar(p.nombre) === t) : undefined;
}

/** Países del catálogo que empiezan con (o contienen) lo escrito; máx. 6. */
export function sugerirPaises(texto: string): Pais[] {
  const t = normalizar(texto);
  if (t.length < 2) return [];
  const empieza = PAISES.filter((p) => normalizar(p.nombre).startsWith(t));
  const contiene = PAISES.filter((p) => !empieza.includes(p) && normalizar(p.nombre).includes(t));
  return [...empieza, ...contiene].slice(0, 6);
}

/** Nombre plural de la moneda por código ("Soles", "Pesos argentinos"); el código si no se conoce. */
export const nombreMonedaPorCodigo = (codigo: string) => MONEDAS[codigo?.toUpperCase()]?.nombre ?? codigo;
/** Nombre singular ("sol", "peso argentino"); el código si no se conoce. */
export const unidadMonedaPorCodigo = (codigo: string) => MONEDAS[codigo?.toUpperCase()]?.unidad ?? codigo;
