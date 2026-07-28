import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { registrarPushToken } from '../../lib/notifications';
import { reservarPestanaExterna } from '../../lib/pestanaExterna';
import { colors, radius } from '../../constants/theme';

const BOT_TELEGRAM = 'Remesaspv_bot';

// Edición de datos en la misma pantalla (sin navegar a otra ruta): antes
// "Editar mis datos" llevaba a /(auth)/registro (una pantalla ajena a este
// grupo de tabs) y al volver con router.replace('/(cliente)') se veía un
// salto a pantalla blanca. Editando in-place evitamos ese remount y el
// usuario nunca sale de la pestaña Perfil.
export default function Perfil() {
  const { usuario, refreshUsuario } = useAuth();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [conectandoTelegram, setConectandoTelegram] = useState(false);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  // Al volver a esta pantalla (p.ej. tras vincular Telegram y regresar del
  // navegador/app de Telegram) se refresca el usuario para reflejar el
  // nuevo estado de conexión sin que el cliente tenga que hacer nada más.
  useFocusEffect(
    useCallback(() => {
      refreshUsuario();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const conectarTelegram = async () => {
    setConectandoTelegram(true);
    const pestana = reservarPestanaExterna();
    const { data: token, error: tokenError } = await supabase.rpc('generar_token_telegram_propio');
    setConectandoTelegram(false);
    if (tokenError || !token) {
      pestana.asignar(null);
      return;
    }
    pestana.asignar(`https://t.me/${BOT_TELEGRAM}?start=${token}`);
  };

  const empezarEdicion = () => {
    setNombre(usuario?.nombre ?? '');
    setTelefono(usuario?.telefono ?? '');
    setPais(usuario?.pais ?? '');
    setError(null);
    setGuardado(false);
    setEditando(true);
  };

  const cancelar = () => {
    setEditando(false);
    setError(null);
  };

  const guardar = async () => {
    if (!usuario) return;
    setError(null);
    if (!nombre.trim() || !telefono.trim() || !pais.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    setGuardando(true);
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ nombre: nombre.trim(), telefono: telefono.trim(), pais: pais.trim() })
      .eq('id', usuario.id);
    setGuardando(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshUsuario();
    setEditando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  if (editando) {
    return (
      <View style={styles.container}>
        <Text style={styles.nombre}>Editar mis datos</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          placeholder="+51 999 999 999"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>País</Text>
        <TextInput style={styles.input} value={pais} onChangeText={setPais} placeholderTextColor={colors.textMuted} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Guardar</Text>}
        </Pressable>
        <Pressable style={styles.buttonOutline} onPress={cancelar} disabled={guardando}>
          <Text style={styles.buttonOutlineText}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Cliente'}</Text>
      <Text style={styles.dato}>{usuario?.email}</Text>
      <Text style={styles.dato}>{usuario?.telefono}</Text>
      <Text style={styles.datoUltimo}>{usuario?.pais}</Text>

      {guardado && <Text style={styles.exito}>✓ Datos guardados satisfactoriamente</Text>}

      <Pressable style={styles.buttonOutline} onPress={empezarEdicion}>
        <Text style={styles.buttonOutlineText}>Editar mis datos</Text>
      </Pressable>

      <View style={styles.telegramCard}>
        <Text style={styles.telegramTitulo}>Notificaciones por Telegram</Text>
        {usuario?.telegram_connected ? (
          <Text style={styles.exito}>✓ Telegram conectado{usuario.telegram_username ? ` (@${usuario.telegram_username})` : ''}</Text>
        ) : (
          <>
            <Text style={styles.telegramDato}>Conecta tu Telegram para recibir el aviso apenas se valide tu depósito en Perú.</Text>
            <Pressable style={styles.buttonOutline} onPress={conectarTelegram} disabled={conectandoTelegram}>
              {conectandoTelegram ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.buttonOutlineText}>Conectar Telegram</Text>}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: '800' },
  dato: { color: colors.textMuted, fontSize: 14, marginTop: -8 },
  datoUltimo: { color: colors.textMuted, fontSize: 14, marginTop: -8, marginBottom: 12 },
  exito: { color: colors.success, fontSize: 13, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    fontSize: 16,
    marginTop: 6,
    backgroundColor: colors.card,
  },
  error: { color: colors.danger, fontSize: 13 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
  telegramCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, gap: 10, marginTop: 8 },
  telegramTitulo: { color: colors.text, fontSize: 15, fontWeight: '700' },
  telegramDato: { color: colors.textMuted, fontSize: 13 },
});
