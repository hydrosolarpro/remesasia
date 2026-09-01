import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  EstadoPin,
  TipoAccesoPin,
  estadoPinUsuario,
  regenerarPin,
  activarPinPara,
  provisionarPin,
  enlaceWaEnviarPin,
} from '../lib/pinAuth';
import { colors, radius } from '../constants/theme';

interface Props {
  /** id en `usuarios` si la persona ya tiene cuenta. */
  usuarioId?: string | null;
  /** Para provisionar a alguien que nunca inició sesión. */
  provision?: { tipo: TipoAccesoPin; refId: string | null };
  telefonoSugerido?: string | null;
  nombre?: string;
  nombreNegocio?: string;
}

// Bloque para que el Operador Perú / admin gestione el acceso con PIN de
// otra persona de su negocio: activarlo (PIN temporal) o regenerarlo si lo
// olvidó, y enviarlo por un enlace wa.me.
export function GestionPinUsuario({ usuarioId, provision, telefonoSugerido, nombre, nombreNegocio }: Props) {
  const [estado, setEstado] = useState<EstadoPin | null>(null);
  const [tel, setTel] = useState(telefonoSugerido ?? '');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinGenerado, setPinGenerado] = useState<{ pin: string; telefono: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!usuarioId) {
        setEstado({ tiene_pin: false });
        return;
      }
      let vivo = true;
      estadoPinUsuario(usuarioId).then((e) => {
        if (vivo) setEstado(e);
      });
      return () => {
        vivo = false;
      };
    }, [usuarioId])
  );

  const abrirWa = (pin: string, telefono: string) => {
    setPinGenerado({ pin, telefono });
    const enlace = enlaceWaEnviarPin(telefono, pin, nombreNegocio);
    Linking.openURL(enlace).catch(() => {
      const aviso = `PIN temporal: ${pin}. Envíaselo por WhatsApp al +${telefono}.`;
      if (Platform.OS === 'web') window.alert(aviso);
    });
  };

  const ejecutar = async (fn: () => Promise<{ pin: string; telefono: string }>) => {
    setError(null);
    setProcesando(true);
    try {
      const { pin, telefono } = await fn();
      abrirWa(pin, telefono);
      if (usuarioId) estadoPinUsuario(usuarioId).then(setEstado);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PIN.');
    } finally {
      setProcesando(false);
    }
  };

  const onRegenerar = () => usuarioId && ejecutar(() => regenerarPin(usuarioId));
  const onActivarExistente = () => {
    if (!usuarioId) return;
    if (!tel.trim()) {
      setError('Escribe el teléfono con código de país.');
      return;
    }
    ejecutar(() => activarPinPara(usuarioId, tel.trim()));
  };
  const onProvisionar = () => {
    if (!provision) return;
    if (!tel.trim()) {
      setError('Escribe el teléfono con código de país.');
      return;
    }
    ejecutar(() => provisionarPin(provision.tipo, provision.refId, tel.trim(), nombre ?? ''));
  };

  const tienePin = !!estado?.tiene_pin;

  return (
    <View style={styles.box}>
      <Text style={styles.titulo}>Acceso con PIN</Text>

      {tienePin ? (
        <>
          <Text style={styles.texto}>
            Activado{estado?.telefono ? ` (+${estado.telefono})` : ''}
            {estado?.pin_temporal ? ' · PIN temporal, aún sin cambiar' : ''}.
          </Text>
          <Pressable style={styles.btn} onPress={onRegenerar} disabled={procesando}>
            {procesando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.btnTexto}>🔑 Regenerar PIN y enviar por WhatsApp</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.texto}>
            {usuarioId
              ? 'Esta persona aún no tiene PIN. Actívalo para que pueda entrar con su teléfono.'
              : 'Aún no inició sesión. Actívale el acceso con PIN y envíaselo por WhatsApp.'}
          </Text>
          <TextInput
            style={styles.input}
            value={tel}
            onChangeText={setTel}
            keyboardType="phone-pad"
            placeholder="+51 9…  /  +58 4…"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={styles.btn}
            onPress={usuarioId ? onActivarExistente : onProvisionar}
            disabled={procesando}
          >
            {procesando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.btnTexto}>🔑 Activar PIN y enviar por WhatsApp</Text>}
          </Pressable>
        </>
      )}

      {pinGenerado && (
        <Text style={styles.pinAviso}>
          PIN temporal: <Text style={styles.pinNum}>{pinGenerado.pin}</Text> (para +{pinGenerado.telefono}). Se muestra solo ahora; si no
          se abrió WhatsApp, cópialo y envíalo tú.
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, gap: 6, marginTop: 8 },
  titulo: { color: colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  texto: { color: colors.textMuted, fontSize: 13, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.cardAlt,
  },
  btn: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  btnTexto: { color: colors.text, fontWeight: '700', fontSize: 13 },
  pinAviso: { color: colors.warning, fontSize: 12, lineHeight: 16 },
  pinNum: { color: colors.text, fontWeight: '900', fontSize: 14 },
  error: { color: colors.danger, fontSize: 13 },
});
