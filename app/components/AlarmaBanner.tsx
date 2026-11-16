import { useEffect, useRef, useState } from 'react';
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

// Pasos para que el operador deje el sonido de SU dispositivo listo: la
// campana sale por el volumen del equipo, que la app no puede subir sola.
function pasosSonido(): { titulo: string; pasos: string[] } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return {
      titulo: 'iPhone / iPad',
      pasos: [
        'Quita el modo silencio: el interruptor lateral no debe mostrar naranja.',
        'Sube el volumen con los botones laterales mientras pulsas "Probar sonido".',
        'Ajustes → Notificaciones → Remesas IA: activa Sonidos y desactiva el Modo concentración.',
        'Abre la app desde el icono de pantalla de inicio (Compartir → Agregar a pantalla de inicio).',
      ],
    };
  }
  if (/Android/i.test(ua)) {
    return {
      titulo: 'Celular Android',
      pasos: [
        'Sube el volumen multimedia y el de notificaciones al máximo (botones laterales → ícono de ajustes del volumen).',
        'Desactiva "No molestar" y el modo silencio.',
        'Ajustes → Aplicaciones → Chrome → Notificaciones: activadas, con sonido y en importancia Alta.',
        'Mantén esta pestaña abierta y toca "Probar sonido" para comprobarlo.',
      ],
    };
  }
  return {
    titulo: 'Laptop / PC',
    pasos: [
      'Sube el volumen del equipo y comprueba que no esté en silencio ni en otra salida (audífonos, TV, Bluetooth).',
      'Windows: clic derecho en el ícono de volumen → Mezclador de volumen → sube el del navegador. Mac: Ajustes → Sonido → Salida.',
      'Desactiva "Asistente de concentración" (Windows) o "No molestar" (Mac) para que se vean y oigan los avisos.',
      'En el navegador: candado junto a la dirección → Notificaciones y Sonido en "Permitir".',
    ],
  };
}

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

  const [guiaAbierta, setGuiaAbierta] = useState(false);
  const guia = pasosSonido();
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
            <Pressable onPress={() => setGuiaAbierta((v) => !v)} hitSlop={8}>
              <Text style={styles.enlace}>{guiaAbierta ? 'Ocultar ayuda' : '¿No se oye?'}</Text>
            </Pressable>
            <Pressable onPress={onAlternar} hitSlop={8}>
              <Text style={styles.enlace}>{habilitada ? 'Desactivar' : 'Activar'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {guiaAbierta && (
        <View style={styles.guia}>
          <Text style={styles.guiaTitulo}>🔊 Configura el sonido de tu dispositivo ({guia.titulo})</Text>
          <Text style={styles.guiaTexto}>
            La campana usa el volumen de tu equipo. Si no la oyes bien, revisa esto y luego toca "Probar sonido":
          </Text>
          {guia.pasos.map((p, i) => (
            <Text key={i} style={styles.guiaPaso}>
              {i + 1}. {p}
            </Text>
          ))}
          <Text style={styles.guiaNota}>Con la app cerrada, el aviso lo suena el sistema con el tono de notificaciones del dispositivo.</Text>
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

  guia: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  guiaTitulo: { color: colors.text, fontSize: 13, fontWeight: '800' },
  guiaTexto: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  guiaPaso: { color: colors.text, fontSize: 12, lineHeight: 17 },
  guiaNota: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 2 },

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
