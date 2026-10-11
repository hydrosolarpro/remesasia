import { createContext, useContext, useEffect, useMemo, useState, useCallback, PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useAuth } from './auth';

// Corredores de remesas: país de recepción -> Venezuela. Una sola base de
// datos y una sola app; el corredor activo cambia moneda, textos y datos que
// se muestran (ver tablas `corredores` y `negocio_corredores`, migración
// 0112). Perú-Venezuela ('PE-VE') es el corredor por defecto y el de
// respaldo si algo falla al cargar: la app nunca queda sin configuración.

export type CorredorId = 'PE-VE' | 'CO-VE' | 'CL-VE' | 'OT-VE';

/** Valor especial del selector: vista consolidada de todos los corredores del negocio. */
export const TODOS_LOS_CORREDORES = 'TODOS' as const;
export type CorredorSeleccion = CorredorId | typeof TODOS_LOS_CORREDORES;

export interface ConfigCorredor {
  id: CorredorId;
  paisRecepcion: string;
  paisEntrega: string;
  monedaCodigo: string;
  monedaSimbolo: string;
  prefijoTel: string;
  digitosTel: number;
  billetera1: string;
  billetera2: string;
  etiquetaCuenta: string;
  documentoPrincipal: string;
  /** Texto corto para chips/títulos, p. ej. "Perú → Venezuela". */
  etiqueta: string;
}

// Respaldo con EXACTAMENTE lo que hoy muestra Perú-Venezuela.
export const CORREDOR_PE_VE: ConfigCorredor = {
  id: 'PE-VE',
  paisRecepcion: 'Perú',
  paisEntrega: 'Venezuela',
  monedaCodigo: 'PEN',
  monedaSimbolo: 'S/',
  prefijoTel: '51',
  digitosTel: 9,
  billetera1: 'Yape',
  billetera2: 'Plin',
  etiquetaCuenta: 'CCI',
  documentoPrincipal: 'DNI',
  etiqueta: 'Perú → Venezuela',
};

const BANDERAS: Record<CorredorId, string> = { 'PE-VE': '🇵🇪', 'CO-VE': '🇨🇴', 'CL-VE': '🇨🇱', 'OT-VE': '🌎' };
export const banderaCorredor = (id: CorredorId) => BANDERAS[id] ?? '🌎';

interface FilaCorredor {
  corredor: CorredorId;
  activo: boolean;
  pais_nombre: string | null;
  moneda_codigo: string | null;
  moneda_simbolo: string | null;
  prefijo_tel: string | null;
  corredores: {
    id: CorredorId;
    pais_recepcion: string;
    pais_entrega: string;
    moneda_codigo: string | null;
    moneda_simbolo: string | null;
    prefijo_tel: string | null;
    digitos_tel: number | null;
    billetera_1: string | null;
    billetera_2: string | null;
    etiqueta_cuenta: string | null;
    documento_principal: string | null;
  } | null;
}

function aConfig(f: FilaCorredor): ConfigCorredor | null {
  const c = f.corredores;
  if (!c) return null;
  // "Otro país": nombre, moneda y prefijo los define el operador principal.
  const pais = f.corredor === 'OT-VE' ? f.pais_nombre || c.pais_recepcion : c.pais_recepcion;
  return {
    id: f.corredor,
    paisRecepcion: pais,
    paisEntrega: c.pais_entrega,
    monedaCodigo: f.moneda_codigo || c.moneda_codigo || '',
    monedaSimbolo: f.moneda_simbolo || c.moneda_simbolo || f.moneda_codigo || c.moneda_codigo || '$',
    prefijoTel: f.prefijo_tel || c.prefijo_tel || '',
    digitosTel: c.digitos_tel ?? 10,
    billetera1: c.billetera_1 ?? '',
    billetera2: c.billetera_2 ?? '',
    etiquetaCuenta: c.etiqueta_cuenta ?? 'Nº de cuenta',
    documentoPrincipal: c.documento_principal ?? 'Documento',
    etiqueta: `${pais} → ${c.pais_entrega}`,
  };
}

interface CorredorState {
  /** Corredores ACTIVOS del negocio (el principal puede trabajar solo 1 o 2 pares). */
  corredores: ConfigCorredor[];
  /** Selección actual: un corredor o 'TODOS' (consolidado). */
  seleccion: CorredorSeleccion;
  /** Lo que el usuario eligió (aunque su negocio todavía no lo tenga activo): se usa en el login. */
  seleccionPreferida: CorredorSeleccion;
  setSeleccion: (s: CorredorSeleccion) => void;
  /** Configuración del corredor activo; en 'TODOS' es la de la sede (para formatos por defecto). */
  corredor: ConfigCorredor;
  /** Sede principal del negocio: el corredor con el que se abre el dashboard por defecto. */
  sede: CorredorId;
  /** true si el negocio trabaja más de un corredor (hay que mostrar el selector). */
  multiCorredor: boolean;
  esConsolidado: boolean;
  /** Config de un corredor por id (incluye los desactivados, para el historial). */
  configDe: (id: string | null | undefined) => ConfigCorredor;
  recargar: () => Promise<void>;
}

const CorredorContext = createContext<CorredorState>({
  corredores: [CORREDOR_PE_VE],
  seleccion: 'PE-VE',
  seleccionPreferida: 'PE-VE',
  setSeleccion: () => {},
  corredor: CORREDOR_PE_VE,
  sede: 'PE-VE',
  multiCorredor: false,
  esConsolidado: false,
  configDe: () => CORREDOR_PE_VE,
  recargar: async () => {},
});

const CLAVE_SELECCION = 'corredor_seleccionado';

export function CorredorProvider({ children }: PropsWithChildren) {
  const { usuario } = useAuth();
  const [corredores, setCorredores] = useState<ConfigCorredor[]>([CORREDOR_PE_VE]);
  // Todos los corredores del negocio, activos o no (el historial de un corredor
  // desactivado se sigue mostrando con su moneda).
  const [catalogo, setCatalogo] = useState<ConfigCorredor[]>([CORREDOR_PE_VE]);
  const [sede, setSede] = useState<CorredorId>('PE-VE');
  // null = el usuario todavía no eligió: se abre en la sede principal.
  const [seleccion, setSeleccionState] = useState<CorredorSeleccion | null>(null);

  const recargar = useCallback(async () => {
    if (!usuario) {
      setCorredores([CORREDOR_PE_VE]);
      setCatalogo([CORREDOR_PE_VE]);
      setSede('PE-VE');
      return;
    }
    // RLS (negocio_corredores: lectura del negocio) ya filtra al negocio del usuario.
    const { data, error } = await supabase
      .from('negocio_corredores')
      .select(
        'corredor, activo, es_sede, pais_nombre, moneda_codigo, moneda_simbolo, prefijo_tel, corredores(id, pais_recepcion, pais_entrega, moneda_codigo, moneda_simbolo, prefijo_tel, digitos_tel, billetera_1, billetera_2, etiqueta_cuenta, documento_principal)'
      );
    if (error || !data || data.length === 0) {
      setCorredores([CORREDOR_PE_VE]);
      setCatalogo([CORREDOR_PE_VE]);
      setSede('PE-VE');
      return;
    }
    const filas = data as unknown as (FilaCorredor & { es_sede?: boolean })[];
    const orden = (a: ConfigCorredor, b: ConfigCorredor) =>
      a.id === 'PE-VE' ? -1 : b.id === 'PE-VE' ? 1 : a.id.localeCompare(b.id);
    const todos = filas.map(aConfig).filter((c): c is ConfigCorredor => !!c).sort(orden);
    const activos = filas
      .filter((f) => f.activo)
      .map(aConfig)
      .filter((c): c is ConfigCorredor => !!c)
      .sort(orden);
    let visibles = activos.length > 0 ? activos : [CORREDOR_PE_VE];
    // Miembro / VE: solo los corredores que el principal le asignó (equipo_corredor;
    // sin marcas = solo Perú-Venezuela).
    if (usuario.rol === 'operador_peru_miembro' || usuario.rol === 'operador_venezuela') {
      const { data: eq } = await supabase.from('equipo_corredor').select('corredor');
      const ids = new Set<string>(((eq as { corredor: string }[] | null) ?? []).map((r) => r.corredor));
      if (ids.size === 0) ids.add('PE-VE');
      const filtrados = visibles.filter((c) => ids.has(c.id));
      visibles = filtrados.length > 0 ? filtrados : visibles.slice(0, 1);
    }
    const sedeFila = filas.find((f) => f.es_sede && f.activo)?.corredor;
    setCatalogo(todos.length > 0 ? todos : [CORREDOR_PE_VE]);
    setCorredores(visibles);
    setSede(sedeFila && visibles.some((c) => c.id === sedeFila) ? sedeFila : visibles[0].id);
  }, [usuario?.id, usuario?.rol]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Recupera la última selección del usuario (si todavía es válida).
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_SELECCION)
      .then((v) => {
        if (v) setSeleccionState(v as CorredorSeleccion);
      })
      .catch(() => {});
  }, []);

  const elegida: CorredorSeleccion = seleccion ?? sede;
  const valida: CorredorSeleccion =
    elegida === TODOS_LOS_CORREDORES
      ? corredores.length > 1
        ? TODOS_LOS_CORREDORES
        : corredores[0].id
      : corredores.some((c) => c.id === elegida)
        ? elegida
        : sede;

  const setSeleccion = useCallback((s: CorredorSeleccion) => {
    setSeleccionState(s);
    AsyncStorage.setItem(CLAVE_SELECCION, s).catch(() => {});
  }, []);

  const valor = useMemo<CorredorState>(() => {
    const activo =
      corredores.find((c) => c.id === valida) ?? corredores.find((c) => c.id === sede) ?? corredores[0];
    return {
      corredores,
      seleccion: valida,
      seleccionPreferida: elegida,
      setSeleccion,
      corredor: activo,
      sede,
      multiCorredor: corredores.length > 1,
      esConsolidado: valida === TODOS_LOS_CORREDORES,
      configDe: (id) => catalogo.find((c) => c.id === id) ?? CORREDOR_PE_VE,
      recargar,
    };
  }, [corredores, catalogo, valida, elegida, sede, setSeleccion, recargar]);

  return <CorredorContext.Provider value={valor}>{children}</CorredorContext.Provider>;
}

export const useCorredor = () => useContext(CorredorContext);
