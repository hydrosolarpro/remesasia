import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { resolverContextoOperador } from '../../lib/sesionOperador';
import { Tasa } from '../../types/database';
import { colors } from '../../constants/theme';

const HOY = () => new Date().toISOString().slice(0, 10);

/** F1 — Tasa del día (Tv, Soles -> Bolívares Soberanos) y Tasa de
 *  adquisición (Ta, usada para calcular Ganancia Bruta/Neta). Solo el
 *  Operador principal de Perú puede publicarlas; un miembro o el Operador
 *  de Venezuela las ven solo lectura (en su Panel). */
export default function TasaDelDia() {
  const { usuario } = useAuth();
  const [tasaActual, setTasaActual] = useState<Tasa | null>(null);
  const [penVes, setPenVes] = useState('');
  const [tasaAdquisicion, setTasaAdquisicion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [cargandoCtx, setCargandoCtx] = useState(true);

  const cargar = async (negocioId: string) => {
    const { data } = await supabase
      .from('tasas')
      .select('*')
      .eq('fecha', HOY())
      .eq('publicada_por', negocioId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTasaActual(data as Tasa | null);
    if (data) {
      setPenVes(String(data.tasa_pen_ves));
      setTasaAdquisicion(data.tasa_adquisicion != null ? String(data.tasa_adquisicion) : '');
    }
  };

  useEffect(() => {
    if (!usuario) return;
    resolverContextoOperador(usuario).then((ctx) => {
      setEsPrincipal(ctx.tipo === 'principal');
      if (ctx.negocioId) cargar(ctx.negocioId);
      setCargandoCtx(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  const publicar = async () => {
    if (!usuario || !esPrincipal) return;
    setMensaje(null);
    if (!penVes || !tasaAdquisicion) {
      setMensaje('Ingresa la tasa de venta y la tasa de adquisición antes de publicar.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('publicar_tasa_del_dia', {
      p_fecha: HOY(),
      p_tasa_pen_ves: Number(penVes),
      p_tasa_adquisicion: Number(tasaAdquisicion),
    });
    setLoading(false);
    if (error) {
      setMensaje(error.message);
      return;
    }
    setMensaje('Tasa publicada. Ya está visible para los clientes y para todo el equipo.');
    const ctx = await resolverContextoOperador(usuario);
    if (ctx.negocioId) cargar(ctx.negocioId);
  };

  if (cargandoCtx) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasa del día — {HOY()}</Text>
      {tasaActual && (
        <Text style={styles.hint}>
          Última publicada: venta S/1 = Bs {tasaActual.tasa_pen_ves}
          {tasaActual.tasa_adquisicion != null ? ` · adquisición S/1 = Bs ${tasaActual.tasa_adquisicion}` : ''}
        </Text>
      )}

      {esPrincipal ? (
        <>
          <Text style={styles.label}>Tasa de adquisición (Ta) — cuánto pagas tú por cada bolívar</Text>
          <TextInput
            style={styles.input}
            value={tasaAdquisicion}
            onChangeText={setTasaAdquisicion}
            keyboardType="decimal-pad"
            placeholder="33.50"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Tasa de venta al cliente (Tv) — Soles → Bolívares Soberanos</Text>
          <TextInput
            style={styles.input}
            value={penVes}
            onChangeText={setPenVes}
            keyboardType="decimal-pad"
            placeholder="34.20"
            placeholderTextColor={colors.textMuted}
          />

          {mensaje && <Text style={styles.mensaje}>{mensaje}</Text>}

          <Pressable style={styles.button} onPress={publicar} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Guardar tasas</Text>}
          </Pressable>
        </>
      ) : (
        <Text style={styles.soloLectura}>
          Las tasas del día solo pueden ser actualizadas por el Operador principal de Perú. Tú las ves en tu Panel, sin opción a
          editar.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 10 },
  title: { color: colors.text, fontSize: 23, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 15, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 15, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.text, fontSize: 21 },
  mensaje: { color: colors.accent, fontSize: 15, marginTop: 8 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 18 },
  soloLectura: { color: colors.textMuted, fontSize: 16, lineHeight: 20, marginTop: 16 },
});
