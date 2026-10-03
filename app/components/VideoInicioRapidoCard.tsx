import { createElement } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Linking } from 'react-native';
import { VIDEO_INICIO_CLIENTE_URL } from '../lib/materiales';
import { colors, radius, cardShadow } from '../constants/theme';

// Video de inicio rápido, visible en el Inicio del cliente. En web se
// reproduce incrustado (<video> nativo del navegador, sin dependencias
// nuevas; preload="metadata" para no bajar los ~8 MB hasta que lo
// reproduzca). En el celular nativo se abre con el reproductor del sistema.
export function VideoInicioRapidoCard() {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>▶ Video de inicio rápido</Text>
      <Text style={styles.ayuda}>Mira en pocos minutos cómo enviar tu remesa a Venezuela paso a paso.</Text>
      {Platform.OS === 'web' ? (
        createElement('video', {
          src: VIDEO_INICIO_CLIENTE_URL,
          controls: true,
          playsInline: true,
          preload: 'metadata',
          style: { width: '100%', borderRadius: 10, backgroundColor: '#000', marginTop: 4 },
        })
      ) : (
        <Pressable style={styles.boton} onPress={() => Linking.openURL(VIDEO_INICIO_CLIENTE_URL)}>
          <Text style={styles.botonTexto}>▶ Ver video</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  titulo: { color: colors.text, fontSize: 17, fontWeight: '800' },
  ayuda: { color: colors.textMuted, fontSize: 14, lineHeight: 18 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 4 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
