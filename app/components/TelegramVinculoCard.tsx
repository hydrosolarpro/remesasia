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
export function TelegramVinculoCard({ avisoSolicitudes = false }: { avisoSolicitudes?: boolean } = {}) {
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

  const pendiente = avisoSolicitudes && !usuario?.telegram_connected;

  return (
    <View style={[styles.card, cardShadow, pendiente && styles.cardUrgente]}>
      {pendiente && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitulo}>🔔 ¡VINCULA TU TELEGRAM AHORA!</Text>
          <Text style={styles.bannerTexto}>
            Sin vincular Telegram NO recibirás el aviso de cada nueva solicitud de tus clientes (cliente, monto y hora). Pulsa el botón de abajo y
            toca “Iniciar” en el chat del bot.
          </Text>
        </View>
      )}
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
          <Pressable style={[styles.boton, pendiente && styles.botonUrgente]} onPress={conectar} disabled={conectando}>
            {conectando ? (
              <ActivityIndicator color={pendiente ? '#fff' : colors.accent} />
            ) : (
              <Text style={[styles.botonTexto, pendiente && styles.botonTextoUrgente]}>Conectar Telegram</Text>
            )}
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
  cardUrgente: { borderColor: '#F59E0B', borderWidth: 3 },
  banner: { backgroundColor: '#F59E0B', borderRadius: radius.md, padding: 14, gap: 6 },
  bannerTitulo: { color: '#1F1300', fontSize: 18, fontWeight: '900' },
  bannerTexto: { color: '#1F1300', fontSize: 14, fontWeight: '700' },
  botonUrgente: { backgroundColor: '#229ED9', borderColor: '#229ED9' },
  botonTextoUrgente: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
