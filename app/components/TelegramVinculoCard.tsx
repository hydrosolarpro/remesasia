import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { reservarPestanaExterna } from '../lib/pestanaExterna';
import { colors, radius, cardShadow } from '../constants/theme';

const BOT_TELEGRAM = 'Remesaspv_bot';

// Tarjeta de Perfil para vincular el Telegram del usuario con el bot de
// Remesas IA (mismo mecanismo que el cliente: RPC `generar_token_telegram_propio`
// + webhook `telegram-webhook`, que funciona para cualquier rol). Se usa en
// los perfiles de operadores; el cliente tiene su propia tarjeta en
// app/(cliente)/perfil.tsx.
export function TelegramVinculoCard() {
  const { usuario, refreshUsuario } = useAuth();
  const [conectando, setConectando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al volver desde Telegram se refresca el usuario para mostrar "conectado".
  useFocusEffect(
    useCallback(() => {
      refreshUsuario();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const conectar = async () => {
    setConectando(true);
    setError(null);
    const pestana = reservarPestanaExterna();
    const { data: token, error: tokenError } = await supabase.rpc('generar_token_telegram_propio');
    setConectando(false);
    if (tokenError || !token) {
      pestana.asignar(null);
      setError('No se pudo generar el enlace. Inténtalo de nuevo.');
      return;
    }
    pestana.asignar(`https://t.me/${BOT_TELEGRAM}?start=${token}`);
  };

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>Vincular mi Telegram</Text>
      {usuario?.telegram_connected ? (
        <Text style={styles.exito}>✓ Telegram conectado{usuario.telegram_username ? ` (@${usuario.telegram_username})` : ''}</Text>
      ) : (
        <>
          <Text style={styles.dato}>
            Para vincular tu cuenta <Text style={styles.negrita}>debes tener una cuenta de Telegram</Text> (es gratuita). Si aún no la tienes,
            descarga la app y créala antes de continuar.
          </Text>
          <Pressable onPress={() => Linking.openURL('https://telegram.org/apps')}>
            <Text style={styles.enlace}>Descargar Telegram</Text>
          </Pressable>
          <Text style={styles.dato}>
            Al vincularla, el bot de Remesas IA te enviará avisos importantes de tu cuenta, incluidos avisos de seguridad.
          </Text>
          <Pressable style={styles.boton} onPress={conectar} disabled={conectando}>
            {conectando ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.botonTexto}>Conectar Telegram</Text>}
          </Pressable>
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800', flexShrink: 1, flexWrap: 'wrap' },
  dato: { color: colors.textMuted, fontSize: 14, flexShrink: 1, flexWrap: 'wrap' },
  negrita: { color: colors.text, fontWeight: '700' },
  enlace: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  exito: { color: colors.success, fontSize: 15, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
  boton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  botonTexto: { color: colors.accent, fontWeight: '700' },
});
