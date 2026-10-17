import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useCorredor } from '../lib/corredor';
import { hoyLima } from '../lib/tasaEspecial';
import { colors, radius } from '../constants/theme';

// Tasa especial del día para UN cliente (vale solo hoy, en hora de Lima).
// Misma lógica que el bloque inline de app/(operador-peru)/clientes.tsx.
export function TasaEspecialCliente({ negocioId, clienteId }: { negocioId: string; clienteId: string }) {
  const { usuario } = useAuth();
  const { corredor } = useCorredor();
  const [vigente, setVigente] = useState<number | null>(null);
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('tasas_cliente')
      .select('tasa_pen_ves')
      .eq('cliente_id', clienteId)
      .eq('corredor', corredor.id)
      .eq('fecha', hoyLima())
      .maybeSingle();
    setVigente(data ? Number(data.tasa_pen_ves) : null);
    setValor('');
  }, [clienteId, corredor.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const avisar = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') window.alert(`${titulo}: ${mensaje}`);
    else Alert.alert(titulo, mensaje);
  };

  const guardar = async () => {
    const n = Number(valor.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      avisar('Tasa inválida', 'Ingresa una tasa mayor a 0.');
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('tasas_cliente').upsert(
      {
        negocio_operador_peru_id: negocioId,
        cliente_id: clienteId,
        corredor: corredor.id,
        fecha: hoyLima(),
        tasa_pen_ves: n,
        publicada_por: usuario?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cliente_id,corredor,fecha' }
    );
    setGuardando(false);
    if (error) return avisar('No se pudo guardar', error.message);
    cargar();
  };

  const quitar = async () => {
    setGuardando(true);
    const { error } = await supabase
      .from('tasas_cliente')
      .delete()
      .eq('cliente_id', clienteId)
      .eq('corredor', corredor.id)
      .eq('fecha', hoyLima());
    setGuardando(false);
    if (error) return avisar('No se pudo quitar', error.message);
    cargar();
  };

  return (
    <View style={styles.box}>
      <Text style={styles.titulo}>Tasa especial del día{vigente ? `: VES ${vigente}` : ' (usa la tasa general)'}</Text>
      <View style={styles.fila}>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={setValor}
          placeholder="Ej: 275"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
        <Pressable style={[styles.guardar, guardando && { opacity: 0.5 }]} disabled={guardando} onPress={guardar}>
          <Text style={styles.guardarTexto}>Guardar</Text>
        </Pressable>
        {!!vigente && (
          <Pressable disabled={guardando} onPress={quitar}>
            <Text style={styles.quitar}>Quitar</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.nota}>Vale solo hoy; mañana vuelve a la tasa general.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6, paddingTop: 8 },
  titulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8, color: colors.text, fontSize: 15, backgroundColor: colors.cardAlt },
  guardar: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  guardarTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  quitar: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  nota: { color: colors.textMuted, fontSize: 12 },
});
