import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCorredor } from '../lib/corredor';
import { ComisionInput } from './ComisionInput';
import { colors, radius } from '../constants/theme';

// % de comisión de un operador POR CORREDOR, fijado por el operador
// principal (dueño del negocio). Si un corredor no tiene valor propio se usa
// el % base del operador (el campo de arriba). Solo aparece si el negocio
// trabaja más de un corredor.
export function ComisionPorCorredor({
  tipo,
  operadorId,
  base,
}: {
  tipo: 'peru_miembro' | 'venezuela';
  operadorId: string;
  base: number | null;
}) {
  const { usuario } = useAuth();
  const { corredores } = useCorredor();
  const [valores, setValores] = useState<Record<string, number>>({});

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const { data } = await supabase
      .from('comisiones_corredor')
      .select('corredor, comision_pct')
      .eq('negocio_id', usuario.id)
      .eq('tipo', tipo)
      .eq('operador_id', operadorId);
    const m: Record<string, number> = {};
    (data ?? []).forEach((r) => {
      m[r.corredor as string] = Number(r.comision_pct);
    });
    setValores(m);
  }, [usuario?.id, tipo, operadorId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const otros = corredores.filter((c) => c.id !== 'PE-VE');
  if (!usuario || otros.length === 0) return null;

  const guardar = async (corredor: string, pct: number): Promise<string | null> => {
    const { error } = await supabase.from('comisiones_corredor').upsert(
      {
        negocio_id: usuario.id,
        tipo,
        operador_id: operadorId,
        corredor,
        comision_pct: pct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tipo,operador_id,corredor' }
    );
    if (error) return error.message;
    setValores((prev) => ({ ...prev, [corredor]: pct }));
    return null;
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Comisión por corredor</Text>
      <Text style={styles.ayuda}>
        Perú-Venezuela usa el % de arriba. Para cada país escribe su % (si lo dejas igual al base, usa el base).
      </Text>
      {otros.map((c) => (
        <View key={c.id} style={styles.fila}>
          <Text style={styles.nombre}>{c.etiqueta}</Text>
          <ComisionInput
            style={styles.input}
            valor={valores[c.id] ?? base ?? 0}
            onGuardar={(pct) => guardar(c.id, pct)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  titulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  ayuda: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  fila: { gap: 4 },
  nombre: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 15,
  },
});
