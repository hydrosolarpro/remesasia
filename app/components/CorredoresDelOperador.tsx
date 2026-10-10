import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCorredor, banderaCorredor } from '../lib/corredor';
import { colors, radius } from '../constants/theme';

// El operador principal arma su equipo por corredor: marca en cuáles países
// de recepción (→ Venezuela) trabaja cada miembro de Perú / operador de
// Venezuela. Un operador sin ninguna marca trabaja solo Perú-Venezuela
// (comportamiento de siempre). Solo aparece si el negocio tiene más de un
// corredor activo.
export function CorredoresDelOperador({
  tipo,
  operadorId,
}: {
  tipo: 'peru_miembro' | 'venezuela';
  operadorId: string;
}) {
  const { usuario } = useAuth();
  const { corredores } = useCorredor();
  const [asignados, setAsignados] = useState<Set<string>>(new Set());
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const { data } = await supabase
      .from('equipo_corredor')
      .select('corredor')
      .eq('negocio_id', usuario.id)
      .eq('tipo', tipo)
      .eq('operador_id', operadorId);
    const s = new Set<string>((data ?? []).map((r) => r.corredor as string));
    // Sin marcas = trabaja solo Perú-Venezuela.
    if (s.size === 0) s.add('PE-VE');
    setAsignados(s);
    setCargado(true);
  }, [usuario?.id, tipo, operadorId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!usuario || corredores.length < 2 || !cargado) return null;

  const alternar = async (id: string) => {
    setError(null);
    const activo = asignados.has(id);
    if (activo && asignados.size === 1) {
      setError('El operador debe trabajar al menos un corredor.');
      return;
    }
    // Primera edición: se materializa el valor implícito (PE-VE) para que
    // quitarlo después tenga efecto.
    const { error: e } = activo
      ? await supabase
          .from('equipo_corredor')
          .delete()
          .eq('negocio_id', usuario.id)
          .eq('tipo', tipo)
          .eq('operador_id', operadorId)
          .eq('corredor', id)
      : await supabase
          .from('equipo_corredor')
          .upsert(
            [
              ...Array.from(asignados).map((c) => ({ negocio_id: usuario.id, tipo, operador_id: operadorId, corredor: c })),
              { negocio_id: usuario.id, tipo, operador_id: operadorId, corredor: id },
            ],
            { onConflict: 'tipo,operador_id,corredor' }
          );
    if (e) {
      setError(e.message);
      return;
    }
    cargar();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Corredores en los que trabaja</Text>
      <View style={styles.fila}>
        {corredores.map((c) => {
          const activo = asignados.has(c.id);
          return (
            <Pressable key={c.id} style={[styles.chip, activo && styles.chipActivo]} onPress={() => alternar(c.id)}>
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
                {activo ? '✓ ' : ''}
                {banderaCorredor(c.id)} {c.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  titulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  chipTextoActivo: { color: colors.text },
  error: { color: colors.danger, fontSize: 13 },
});
