import { useRef, useState } from 'react';
import { Modal, View, Pressable, Text, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { colors, radius } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const ZOOM_MAX = 3;
const ZOOM_PASO = 0.6;

// Visor de comprobante a pantalla completa, con zoom: sin esto, la imagen
// picada quedaba en una previsualización de 160px de alto, ilegible para
// verificar montos/números de cuenta antes de enviar la solicitud (ver
// (cliente)/index.tsx). Zoom por botones +/- y doble toque (fiable en
// cualquier plataforma), con arrastre de un dedo para recorrer la imagen
// ampliada -- sin agregar dependencias nuevas de gestos/pinch.
export function ZoomableImageModal({ visible, uri, onClose }: { visible: boolean; uri: string | null; onClose: () => void }) {
  const [nivelZoom, setNivelZoom] = useState(1);
  const nivelZoomRef = useRef(1);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateValue = useRef({ x: 0, y: 0 });
  const panInicio = useRef({ x: 0, y: 0 });
  const ultimoToque = useRef(0);

  const aplicarZoom = (nuevo: number) => {
    const acotado = Math.max(1, Math.min(ZOOM_MAX, nuevo));
    nivelZoomRef.current = acotado;
    setNivelZoom(acotado);
    if (acotado === 1) {
      translateValue.current = { x: 0, y: 0 };
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  };

  const alternarZoomDobleToque = () => aplicarZoom(nivelZoomRef.current > 1 ? 1 : 2.2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        panInicio.current = { ...translateValue.current };
      },
      onPanResponderMove: (_evt, gesture) => {
        if (nivelZoomRef.current <= 1) return;
        const nuevoX = panInicio.current.x + gesture.dx;
        const nuevoY = panInicio.current.y + gesture.dy;
        translateValue.current = { x: nuevoX, y: nuevoY };
        translateX.setValue(nuevoX);
        translateY.setValue(nuevoY);
      },
      onPanResponderRelease: (_evt, gesture) => {
        // Toque corto sin arrastre real = tap; se usa para detectar doble toque.
        if (Math.abs(gesture.dx) < 4 && Math.abs(gesture.dy) < 4) {
          const ahora = Date.now();
          if (ahora - ultimoToque.current < 280) alternarZoomDobleToque();
          ultimoToque.current = ahora;
        }
      },
    })
  ).current;

  const cerrar = () => {
    aplicarZoom(1);
    onClose();
  };

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={styles.fondo}>
        <Pressable style={styles.cerrarBtn} onPress={cerrar} hitSlop={12}>
          <Text style={styles.cerrarBtnTexto}>✕</Text>
        </Pressable>
        <Text style={styles.ayuda}>Doble toque, o +/- para hacer zoom · arrastra para moverte</Text>
        <View style={styles.contenedorImagen} {...panResponder.panHandlers}>
          <Animated.Image
            source={{ uri }}
            style={[
              styles.imagen,
              { transform: [{ translateX }, { translateY }, { scale: nivelZoom }] },
            ]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.controles}>
          <Pressable style={styles.zoomBtn} onPress={() => aplicarZoom(nivelZoomRef.current - ZOOM_PASO)} hitSlop={10}>
            <Text style={styles.zoomBtnTexto}>−</Text>
          </Pressable>
          <Text style={styles.zoomTexto}>{Math.round(nivelZoom * 100)}%</Text>
          <Pressable style={styles.zoomBtn} onPress={() => aplicarZoom(nivelZoomRef.current + ZOOM_PASO)} hitSlop={10}>
            <Text style={styles.zoomBtnTexto}>+</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(5,7,14,0.97)', justifyContent: 'center', alignItems: 'center' },
  cerrarBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarBtnTexto: { color: '#fff', fontSize: 20, fontWeight: '700' },
  ayuda: { position: 'absolute', top: 58, left: 20, right: 72, color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  contenedorImagen: { width, height: height * 0.78, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imagen: { width, height: height * 0.78 },
  controles: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  zoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnTexto: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: -2 },
  zoomTexto: { color: '#fff', fontSize: 14, fontWeight: '700', minWidth: 46, textAlign: 'center' },
});
