import { createElement, useRef, useState } from 'react';
import { View, Text, Pressable, Image, Modal, Platform, StyleSheet, Linking } from 'react-native';
import { VIDEO_INICIO_CLIENTE_URL, VIDEO_INICIO_CLIENTE_MINIATURA_URL } from '../lib/materiales';
import { colors, radius } from '../constants/theme';

// Video de inicio rápido para el Inicio del cliente: una miniatura del
// mismo tamaño que el logo del negocio (84x84, ver negocioLogo en
// (cliente)/index.tsx) con la etiqueta "Video", pensada para ir en la
// esquina superior derecha. Al tocarla se despliega un visor con el video
// y un botón de pantalla completa. En web usa el <video> del navegador
// (sin dependencias nuevas; preload="metadata" para no bajar los ~8 MB
// hasta abrirlo); en el celular nativo abre el reproductor del sistema.
export function VideoInicioRapidoCard() {
  const [abierto, setAbierto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const abrir = () => {
    if (Platform.OS === 'web') setAbierto(true);
    else Linking.openURL(VIDEO_INICIO_CLIENTE_URL);
  };

  const pantallaCompleta = () => {
    const el = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    // iOS Safari no soporta requestFullscreen en <video>: usa su propio visor.
    else el.webkitEnterFullscreen?.();
  };

  return (
    <>
      <Pressable style={styles.miniatura} onPress={abrir} accessibilityLabel="Ver video tutorial">
        <View style={styles.imagenWrap}>
          <Image source={{ uri: VIDEO_INICIO_CLIENTE_MINIATURA_URL }} style={styles.imagen} resizeMode="cover" />
          <View style={styles.playWrap}>
            <Text style={styles.play}>▶</Text>
          </View>
        </View>
        <Text style={styles.etiqueta}>🎬 Video tutorial</Text>
      </Pressable>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <View style={styles.fondo}>
          <View style={styles.cabecera}>
            <Text style={styles.tituloModal}>Video tutorial</Text>
            <View style={styles.acciones}>
              <Pressable style={styles.btnPantalla} onPress={pantallaCompleta} hitSlop={8}>
                <Text style={styles.btnPantallaTexto}>⛶ Pantalla completa</Text>
              </Pressable>
              <Pressable style={styles.btnCerrar} onPress={() => setAbierto(false)} hitSlop={12}>
                <Text style={styles.btnCerrarTexto}>✕</Text>
              </Pressable>
            </View>
          </View>
          {abierto &&
            createElement('video', {
              ref: videoRef,
              src: VIDEO_INICIO_CLIENTE_URL,
              poster: VIDEO_INICIO_CLIENTE_MINIATURA_URL,
              controls: true,
              autoPlay: true,
              playsInline: true,
              preload: 'metadata',
              style: { width: '100%', maxWidth: 900, maxHeight: '78%', backgroundColor: '#000', borderRadius: 10 },
            })}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  miniatura: { alignItems: 'center', gap: 4 },
  imagenWrap: { width: 84, height: 84, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.cardAlt },
  imagen: { width: 84, height: 84 },
  playWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  play: { color: '#fff', fontSize: 26 },
  etiqueta: { color: colors.accent, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  fondo: { flex: 1, backgroundColor: 'rgba(5,7,14,0.96)', justifyContent: 'center', alignItems: 'center', padding: 16, gap: 12 },
  cabecera: { width: '100%', maxWidth: 900, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tituloModal: { color: '#fff', fontSize: 16, fontWeight: '800', flexShrink: 1 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnPantalla: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  btnPantallaTexto: { color: colors.text, fontSize: 13, fontWeight: '700' },
  btnCerrar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  btnCerrarTexto: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
