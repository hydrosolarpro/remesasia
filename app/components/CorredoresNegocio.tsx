import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCorredor, banderaCorredor, CorredorId } from '../lib/corredor';
import { DatosPagoCorredor } from './DatosPagoCorredor';
import { colors, radius } from '../constants/theme';

// Administración de corredores del negocio (solo el Operador principal):
// activa/desactiva los países de recepción con los que trabaja. Perú-Venezuela
// siempre queda activo. En "Otro país" define nombre, moneda, símbolo y prefijo.
const OPCIONES: { id: CorredorId; nombre: string; detalle: string }[] = [
  { id: 'CO-VE', nombre: 'Colombia → Venezuela', detalle: 'COP · +57 · Nequi / Daviplata' },
  { id: 'CL-VE', nombre: 'Chile → Venezuela', detalle: 'CLP · +56 · Mach / Tenpo' },
  { id: 'OT-VE', nombre: 'Otro país → Venezuela', detalle: 'Tú defines el país y la moneda' },
];

interface Fila {
  activo: boolean;
  pais_nombre: string;
  moneda_codigo: string;
  moneda_simbolo: string;
  prefijo_tel: string;
}

const VACIA: Fila = { activo: false, pais_nombre: '', moneda_codigo: '', moneda_simbolo: '', prefijo_tel: '' };

export function CorredoresNegocio() {
  const { usuario } = useAuth();
  const { recargar, corredores } = useCorredor();
  const [filas, setFilas] = useState<Record<string, Fila>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from('negocio_corredores')
      .select('corredor, activo, pais_nombre, moneda_codigo, moneda_simbolo, prefijo_tel')
      .eq('negocio_id', usuario.id)
      .then(({ data }) => {
        const m: Record<string, Fila> = {};
        (data ?? []).forEach((r) => {
          m[r.corredor as string] = {
            activo: !!r.activo,
            pais_nombre: r.pais_nombre ?? '',
            moneda_codigo: r.moneda_codigo ?? '',
            moneda_simbolo: r.moneda_simbolo ?? '',
            prefijo_tel: r.prefijo_tel ?? '',
          };
        });
        setFilas(m);
      });
  }, [usuario?.id]);

  const aviso = (t: string) => (Platform.OS === 'web' ? window.alert(t) : Alert.alert('Corredores', t));

  const guardar = async (id: CorredorId, f: Fila) => {
    if (!usuario) return;
    if (id === 'OT-VE' && f.activo && (!f.pais_nombre.trim() || !f.moneda_codigo.trim())) {
      aviso('Para "Otro país" escribe el nombre del país y el código de la moneda (p. ej. ARS).');
      return;
    }
    setGuardando(id);
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
    setGuardando(null);
    if (error) {
      aviso(`No se pudo guardar: ${error.message}`);
      return;
    }
    await recargar();
  };

  const cambiar = (id: CorredorId, parche: Partial<Fila>) =>
    setFilas((prev) => ({ ...prev, [id]: { ...(prev[id] ?? VACIA), ...parche } }));

  return (
    <View style={styles.wrap}>
      <View style={styles.fijo}>
        <Text style={styles.nombre}>{banderaCorredor('PE-VE')} Perú → Venezuela</Text>
        <Text style={styles.detalle}>Siempre activo</Text>
      </View>

      {OPCIONES.map((o) => {
        const f = filas[o.id] ?? VACIA;
        return (
          <View key={o.id} style={styles.item}>
            <View style={styles.cabecera}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>
                  {banderaCorredor(o.id)} {o.nombre}
                </Text>
                <Text style={styles.detalle}>{o.detalle}</Text>
              </View>
              <Pressable
                style={[styles.boton, f.activo && styles.botonActivo]}
                disabled={guardando === o.id}
                onPress={() => {
                  const nuevo = { ...f, activo: !f.activo };
                  cambiar(o.id, { activo: nuevo.activo });
                  guardar(o.id, nuevo);
                }}
              >
                <Text style={styles.botonTexto}>{f.activo ? 'Activo' : 'Activar'}</Text>
              </Pressable>
            </View>

            {f.activo && (
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
                  onChangeText={(t) => cambiar(o.id, { pais_nombre: t })}
                />
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
                <Pressable style={styles.guardarBtn} onPress={() => guardar(o.id, f)} disabled={guardando === o.id}>
                  <Text style={styles.botonTexto}>{guardando === o.id ? 'Guardando…' : 'Guardar datos del país'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
      <Text style={styles.nota}>
        Al activar un corredor, aparece un selector en tu panel, en tus estadísticas y en la sesión de tus clientes
        para operar con ese país con tus mismos operadores y clientes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  fijo: { padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  item: { padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, gap: 8 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: { color: colors.text, fontSize: 16, fontWeight: '800' },
  detalle: { color: colors.textMuted, fontSize: 14 },
  boton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.primary },
  botonActivo: { backgroundColor: colors.success },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  otro: { gap: 8 },
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
});
