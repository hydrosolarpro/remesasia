import { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Linking } from 'react-native';
import { construirEnlaceWhatsAppSinDestino } from '../lib/whatsapp';
import { IMAGEN_INSTALAR_APP_URL } from '../lib/materiales';
import { ZoomableImageModal } from './ZoomableImageModal';
import { colors, radius, cardShadow } from '../constants/theme';

const MENSAJE_COMPARTIR =
  '📲 Así puedes instalar la app de Remesas Perú-Venezuela en tu celular, paso a paso:';

// Tarjeta con la infografía de instalación (agregar la web app a la
// pantalla de inicio del celular) -- todos pueden verla con zoom y
// descargarla; solo los operadores (Perú y Venezuela) pueden reenviarla al
// cliente por WhatsApp o Telegram, ya que es el operador quien necesita
// guiar a su cliente a instalarla.
export function InstalarAppCard({ puedeEnviar = false }: { puedeEnviar?: boolean }) {
  const [zoom, setZoom] = useState(false);

  const enlaceWhatsApp = construirEnlaceWhatsAppSinDestino(`${MENSAJE_COMPARTIR}\n${IMAGEN_INSTALAR_APP_URL}`);
  // Widget oficial de Telegram para compartir un enlace sin necesitar un
  // chat_id fijo -- abre el selector de chats de Telegram, igual que
  // wa.me/?text= abre el selector de contactos de WhatsApp.
  const enlaceTelegram = `https://t.me/share/url?url=${encodeURIComponent(IMAGEN_INSTALAR_APP_URL)}&text=${encodeURIComponent(MENSAJE_COMPARTIR)}`;

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>Instalar la app en el celular</Text>
      <Text style={styles.ayuda}>Guía paso a paso para agregar Remesas Perú-Venezuela a la pantalla de inicio.</Text>
      <Pressable onPress={() => setZoom(true)}>
        <Image source={{ uri: IMAGEN_INSTALAR_APP_URL }} style={styles.imagen} resizeMode="contain" />
        <Text style={styles.verCompletoTexto}>🔍 Toca para verla completa y hacer zoom</Text>
      </Pressable>
      <View style={styles.botonesRow}>
        <Pressable style={styles.descargarBtn} onPress={() => Linking.openURL(IMAGEN_INSTALAR_APP_URL)}>
          <Text style={styles.descargarBtnTexto}>Descargar</Text>
        </Pressable>
        {puedeEnviar && (
          <>
            <Pressable style={styles.whatsappBtn} onPress={() => Linking.openURL(enlaceWhatsApp)}>
              <Text style={styles.whatsappBtnTexto}>Enviar por WhatsApp</Text>
            </Pressable>
            <Pressable style={styles.telegramBtn} onPress={() => Linking.openURL(enlaceTelegram)}>
              <Text style={styles.telegramBtnTexto}>Enviar por Telegram</Text>
            </Pressable>
          </>
        )}
      </View>
      <ZoomableImageModal visible={zoom} uri={IMAGEN_INSTALAR_APP_URL} onClose={() => setZoom(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  ayuda: { color: colors.textMuted, fontSize: 14, lineHeight: 18 },
  imagen: { width: '100%', height: 220, borderRadius: radius.sm, backgroundColor: colors.cardAlt, marginTop: 4 },
  verCompletoTexto: { color: colors.accent, fontWeight: '700', fontSize: 13, textAlign: 'center', marginTop: 6 },
  botonesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  descargarBtn: { flex: 1, minWidth: 120, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  descargarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  whatsappBtn: { flex: 1, minWidth: 150, backgroundColor: colors.success, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  whatsappBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  telegramBtn: { flex: 1, minWidth: 150, backgroundColor: '#2AABEE', borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  telegramBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
