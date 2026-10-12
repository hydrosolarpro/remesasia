import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCorredor, CorredorId } from '../lib/corredor';
import { EtiquetaCorredor } from './SelectorCorredor';
import { DatosPagoCorredor } from './DatosPagoCorredor';
import { buscarPais, sugerirPaises, MONEDAS } from '../lib/paises';
import { colors, radius } from '../constants/theme';

// Administración de corredores del negocio (solo el Operador principal):
// elige con qué pares de países trabaja (1, 2 o todos, y puede agregar más
// adelante), y fija su SEDE PRINCIPAL: el corredor con el que abre su
// dashboard por defecto, sin perder el acceso a los datos de los demás ni a
// la vista "Todos los corredores". Debe quedar al menos un corredor activo.
const OPCIONES: { id: CorredorId; nombre: string; detalle: string }[] = [
  { id: 'PE-VE', nombre: 'Perú → Venezuela', detalle: 'PEN · +51 · Yape / Plin' },
  { id: 'CO-VE', nombre: 'Colombia → Venezuela', detalle: 'COP · +57 · Nequi / Daviplata' },
  { id: 'CL-VE', nombre: 'Chile → Venezuela', detalle: 'CLP · +56 · Mach / Tenpo' },
  { id: 'OT-VE', nombre: 'Otro país → Venezuela', detalle: 'Escribe el país (Argentina, Bolivia, Ecuador, México, Panamá, España, Centroamérica…) y la moneda se completa sola' },
];

interface Fila {
  activo: boolean;
  es_sede: boolean;
  pais_nombre: string;
  moneda_codigo: string;
  moneda_simbolo: string;
  prefijo_tel: string;
}

const VACIA: Fila = { activo: false, es_sede: false, pais_nombre: '', moneda_codigo: '', moneda_simbolo: '', prefijo_tel: '' };

export function CorredoresNegocio() {
  const { usuario } = useAuth();
  const { recargar, corredores } = useCorredor();
  const [filas, setFilas] = useState<Record<string, Fila>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  const aviso = (t: string) => (Platform.OS === 'web' ? window.alert(t) : Alert.alert('Corredores', t));

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const { data } = await supabase
      .from('negocio_corredores')
      .select('corredor, activo, es_sede, pais_nombre, moneda_codigo, moneda_simbolo, prefijo_tel')
      .eq('negocio_id', usuario.id);
    const m: Record<string, Fila> = {};
    (data ?? []).forEach((r) => {
      m[r.corredor as string] = {
        activo: !!r.activo,
        es_sede: !!r.es_sede,
        pais_nombre: r.pais_nombre ?? '',
        moneda_codigo: r.moneda_codigo ?? '',
        moneda_simbolo: r.moneda_simbolo ?? '',
        prefijo_tel: r.prefijo_tel ?? '',
      };
    });
    // Sin fila de Perú-Venezuela = activo (comportamiento histórico).
    if (!m['PE-VE']) m['PE-VE'] = { ...VACIA, activo: true, es_sede: !Object.values(m).some((f) => f.es_sede) };
    setFilas(m);
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const get = (id: string): Fila => filas[id] ?? VACIA;
  const activos = OPCIONES.filter((o) => get(o.id).activo).map((o) => o.id);
  const sedeActual = (OPCIONES.find((o) => get(o.id).es_sede && get(o.id).activo)?.id ?? activos[0]) as CorredorId | undefined;

  const guardarFila = async (id: CorredorId, f: Fila) => {
    if (!usuario) return false;
    if (id === 'OT-VE' && f.activo && (!f.pais_nombre.trim() || !f.moneda_codigo.trim())) {
      aviso('Para "Otro país" escribe el nombre del país y el código de la moneda (p. ej. ARS).');
      return false;
    }
    const { error } = await supabase.from('negocio_corredores').upsert(
      {
        negocio_id: usuario.id,
        corredor: id,
        activo: f.activo,
        pais_nombre: id === 'OT-VE' ? f.pais_nombre.trim() || null : null,
        moneda_codigo: id === 'OT-VE' ? f.moneda_codigo.trim().toUpperCase() || null : null,
        moneda_simbolo: id === 'OT-VE' ? f.moneda_simbolo.trim() || null : null,
        prefijo_tel: id === 'OT-VE' ? f.prefijo_tel.replace(/\D/g, '') || null : null,
      },
      { onConflict: 'negocio_id,corredor' }
    );
    if (error) {
      aviso(`No se pudo guardar: ${error.message}`);
      return false;
    }
    return true;
  };

  // La sede debe ser UNA sola: se limpia y se marca (índice único parcial).
  const fijarSede = async (id: CorredorId) => {
    if (!usuario) return;
    setGuardando(id);
    const { error: e1 } = await supabase.from('negocio_corredores').update({ es_sede: false }).eq('negocio_id', usuario.id);
    if (!e1) {
      const { error: e2 } = await supabase
        .from('negocio_corredores')
        .update({ es_sede: true })
        .eq('negocio_id', usuario.id)
        .eq('corredor', id);
      if (e2) aviso(`No se pudo fijar la sede: ${e2.message}`);
    } else {
      aviso(`No se pudo fijar la sede: ${e1.message}`);
    }
    setGuardando(null);
    await cargar();
    await recargar();
  };

  const alternar = async (id: CorredorId) => {
    const f = get(id);
    if (f.activo && activos.length === 1) {
      aviso('Debe quedar al menos un corredor activo.');
      return;
    }
    // "Otro país" sin país escrito todavía: se abre el formulario y se
    // activa al guardar el país (ver "Guardar y activar").
    if (id === 'OT-VE' && !f.activo && (!f.pais_nombre.trim() || !f.moneda_codigo.trim())) {
      cambiar(id, { activo: true });
      return;
    }
    setGuardando(id);
    const ok = await guardarFila(id, { ...f, activo: !f.activo });
    if (ok) {
      // Si se desactivó la sede, la sede pasa al primer corredor que quede activo.
      if (f.activo && sedeActual === id) {
        const otro = activos.find((a) => a !== id) as CorredorId | undefined;
        if (otro) await fijarSede(otro);
      } else if (!f.activo && !sedeActual) {
        await fijarSede(id);
      }
    }
    setGuardando(null);
    await cargar();
    await recargar();
  };

  const cambiar = (id: CorredorId, parche: Partial<Fila>) =>
    setFilas((prev) => ({ ...prev, [id]: { ...(prev[id] ?? VACIA), ...parche } }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.nota}>
        Trabaja solo con los pares de países que necesites (1, 2 o todos) y agrega más cuando quieras. Tu{' '}
        <Text style={styles.negrita}>sede principal</Text> es el corredor con el que se abre tu dashboard; igual puedes
        ver los datos de todos con "Todos los corredores".
      </Text>

      {OPCIONES.map((o) => {
        const f = get(o.id);
        const esSede = sedeActual === o.id;
        return (
          <View key={o.id} style={styles.item}>
            <View style={styles.cabecera}>
              <View style={{ flex: 1 }}>
                <EtiquetaCorredor id={o.id} etiqueta={o.nombre} activo />
                <Text style={styles.detalle}>{o.detalle}</Text>
              </View>
              <Pressable
                style={[styles.boton, f.activo && styles.botonActivo]}
                disabled={guardando === o.id}
                onPress={() => alternar(o.id)}
              >
                <Text style={styles.botonTexto}>{f.activo ? 'Activo' : 'Activar'}</Text>
              </Pressable>
            </View>

            {f.activo && (
              <Pressable
                style={[styles.sede, esSede && styles.sedeActiva]}
                disabled={esSede || guardando === o.id}
                onPress={() => fijarSede(o.id)}
              >
                <Text style={[styles.sedeTexto, esSede && styles.sedeTextoActiva]}>
                  {esSede ? '★ Sede principal' : '☆ Fijar como sede principal'}
                </Text>
              </Pressable>
            )}

            {o.id !== 'PE-VE' && f.activo && (
              <DatosPagoCorredor
                corredor={o.id}
                sugerencia1={corredores.find((c) => c.id === o.id)?.billetera1 ?? ''}
                sugerencia2={corredores.find((c) => c.id === o.id)?.billetera2 ?? ''}
                etiquetaCuenta={corredores.find((c) => c.id === o.id)?.etiquetaCuenta ?? 'Nº de cuenta'}
              />
            )}

            {o.id === 'OT-VE' && f.activo && (
              <View style={styles.otro}>
                <TextInput
                  style={styles.input}
                  placeholder="País de recepción (ej. Argentina)"
                  placeholderTextColor={colors.textMuted}
                  value={f.pais_nombre}
                  onChangeText={(t) => {
                    // Si coincide con un país del catálogo, completa moneda, símbolo y prefijo.
                    const p = buscarPais(t);
                    const m = p ? MONEDAS[p.moneda] : undefined;
                    cambiar(
                      o.id,
                      p && m
                        ? { pais_nombre: p.nombre, moneda_codigo: m.codigo, moneda_simbolo: m.simbolo, prefijo_tel: p.prefijo }
                        : { pais_nombre: t }
                    );
                  }}
                />
                {!buscarPais(f.pais_nombre) &&
                  sugerirPaises(f.pais_nombre).map((p) => (
                    <Pressable
                      key={p.nombre}
                      style={styles.sugerencia}
                      onPress={() => {
                        const m = MONEDAS[p.moneda];
                        cambiar(o.id, { pais_nombre: p.nombre, moneda_codigo: m.codigo, moneda_simbolo: m.simbolo, prefijo_tel: p.prefijo });
                      }}
                    >
                      <Text style={styles.sugerenciaTexto}>
                        {p.nombre} · {MONEDAS[p.moneda].nombre} ({p.moneda})
                      </Text>
                    </Pressable>
                  ))}
                {!!f.moneda_codigo && (
                  <Text style={styles.nota}>
                    Moneda: {MONEDAS[f.moneda_codigo.toUpperCase()]?.nombre ?? f.moneda_codigo.toUpperCase()} ({f.moneda_codigo.toUpperCase()}
                    {f.moneda_simbolo ? ` · ${f.moneda_simbolo}` : ''}){f.prefijo_tel ? ` · +${f.prefijo_tel}` : ''}. Puedes ajustar los
                    datos abajo si tu país no está en la lista.
                  </Text>
                )}
                <TextInput
                  style={styles.input}
                  placeholder="Código de moneda (ej. ARS)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  value={f.moneda_codigo}
                  onChangeText={(t) => cambiar(o.id, { moneda_codigo: t })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Símbolo (ej. $)"
                  placeholderTextColor={colors.textMuted}
                  value={f.moneda_simbolo}
                  onChangeText={(t) => cambiar(o.id, { moneda_simbolo: t })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Prefijo telefónico sin + (ej. 54)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={f.prefijo_tel}
                  onChangeText={(t) => cambiar(o.id, { prefijo_tel: t })}
                />
                <Pressable
                  style={styles.guardarBtn}
                  disabled={guardando === o.id}
                  onPress={async () => {
                    setGuardando(o.id);
                    if (await guardarFila(o.id, f)) await recargar();
                    setGuardando(null);
                  }}
                >
                  <Text style={styles.botonTexto}>{guardando === o.id ? 'Guardando…' : 'Guardar y activar'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  item: { padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detalle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  boton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.primary },
  botonActivo: { backgroundColor: colors.success },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sede: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  sedeActiva: { borderColor: colors.accent, backgroundColor: `${colors.accent}22` },
  sedeTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  sedeTextoActiva: { color: colors.text },
  otro: { gap: 8 },
  sugerencia: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  sugerenciaTexto: { color: colors.text, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 15,
  },
  guardarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  nota: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  negrita: { color: colors.text, fontWeight: '800' },
});
