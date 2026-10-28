import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../constants/theme';

type Props = {
  sonando: boolean;
  /** Resumen de las solicitudes recién llegadas, la más reciente primero. */
  nuevas: string[];
  habilitada: boolean;
  audioBloqueado: boolean;
  cantidad: number;
  onSilenciar: () => void;
  onAlternar: () => void;
  onActivarAudio: () => void;
  onProbar: () => void;
};

const NATIVO = Platform.OS !== 'web';

// Aviso estilo Hotmart: al llegar una solicitud entra un mensaje emergente
// con los datos (cliente y monto) mientras suena el "cha-ching". Queda en
// pantalla, sonando, hasta que el operador lo cierra. Sale arriba a la
// derecha en laptop y a todo el ancho en móvil, encima del panel.
// Además, en reposo muestra una fila discreta para probar el sonido o
// apagar la alarma, y una barra ámbar si el navegador bloquea el audio.
export function AlarmaBanner({ sonando, nuevas, habilitada, audioBloqueado, cantidad, onSilenciar, onAlternar, onActivarAudio, onProbar }: Props) {
  const entrada = useRef(new Animated.Value(0)).current;
  const pulso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!sonando) {
      entrada.setValue(0);
      pulso.setValue(1);
      return;
    }
    Animated.spring(entrada, { toValue: 1, friction: 7, tension: 70, useNativeDriver: NATIVO }).start();
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.03, duration: 500, useNativeDriver: NATIVO }),
        Animated.timing(pulso, { toValue: 1, duration: 500, useNativeDriver: NATIVO }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [sonando, entrada, pulso]);

  const principal = nuevas[0] ?? '';
  const otras = Math.max(cantidad, nuevas.length) - 1;

  return (
    <>
      {habilitada && audioBloqueado ? (
        <Pressable onPress={onActivarAudio} style={[styles.barra, styles.barraAviso]} accessibilityRole="button">
          <Text style={styles.textoAviso}>🔊 Toca aquí para activar el sonido de las alarmas</Text>
        </Pressable>
      ) : (
        <View style={[styles.barra, styles.barraReposo]}>
          <Text style={styles.textoReposo}>{habilitada ? '🔔 Alarma de solicitudes activada' : '🔕 Alarma desactivada'}</Text>
          <View style={styles.acciones}>
            {habilitada && (
              <Pressable onPress={onProbar} hitSlop={8}>
                <Text style={styles.enlace}>Probar sonido</Text>
              </Pressable>
            )}
            <Pressable onPress={onAlternar} hitSlop={8}>
              <Text style={styles.enlace}>{habilitada ? 'Desactivar' : 'Activar'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {sonando && (
        <View style={styles.capa} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.tarjeta,
              {
                opacity: entrada,
                transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }, { scale: pulso }],
              },
            ]}
          >
            <View style={styles.icono}>
              <Text style={styles.iconoTxt}>💰</Text>
            </View>
            <View style={styles.cuerpo}>
              <Text style={styles.titulo}>¡Nueva solicitud!</Text>
              <Text style={styles.detalle} numberOfLines={2}>
                {principal || 'Tienes una solicitud por atender'}
              </Text>
              {otras > 0 && <Text style={styles.mas}>+{otras} más por atender</Text>}
            </View>
            <Pressable onPress={onSilenciar} style={styles.btn} accessibilityRole="button" accessibilityLabel="Entendido, silenciar alarma">
              <Text style={styles.btnTxt}>Entendido</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14 },
  barraAviso: { backgroundColor: colors.warning, paddingVertical: 12, justifyContent: 'center' },
  textoAviso: { color: '#1a1300', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  barraReposo: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6 },
  textoReposo: { color: colors.textMuted, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  acciones: { flexDirection: 'row', gap: 14 },
  enlace: { color: colors.accent, fontSize: 12, fontWeight: '700' },

  capa: { position: 'absolute', top: 10, left: 12, right: 12, zIndex: 1000, alignItems: 'flex-end' },
  tarjeta: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderLeftWidth: 6,
    borderLeftColor: colors.success,
    padding: 14,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)' } as object)
      : { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 12 }),
  },
  icono: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E8FBF1', alignItems: 'center', justifyContent: 'center' },
  iconoTxt: { fontSize: 24 },
  cuerpo: { flex: 1 },
  titulo: { color: '#0F8A57', fontSize: 15, fontWeight: '900' },
  detalle: { color: '#141A2E', fontSize: 15, fontWeight: '700', marginTop: 2 },
  mas: { color: '#5B6480', fontSize: 12, fontWeight: '600', marginTop: 2 },
  btn: { backgroundColor: colors.success, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill },
  btnTxt: { color: '#04251A', fontSize: 13, fontWeight: '900' },
});
