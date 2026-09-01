import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { miEstadoPin, EstadoPin } from '../lib/pinAuth';
import { colors, radius, cardShadow } from '../constants/theme';

// Tarjeta de Perfil: acceso con teléfono + PIN de 4 dígitos, alternativo a
// "Continuar con Google". Muestra si ya está activado y lleva a la
// pantalla para crearlo / cambiarlo.
export function PinAccesoCard() {
  const [estado, setEstado] = useState<EstadoPin | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      miEstadoPin().then((e) => {
        if (vivo) setEstado(e);
      });
      return () => {
        vivo = false;
      };
    }, [])
  );

  const tienePin = !!estado?.tiene_pin;

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>Acceso con teléfono + PIN</Text>
      <Text style={styles.texto}>
        {tienePin
          ? `Activado${estado?.telefono ? ` con el teléfono +${estado.telefono}` : ''}. Puedes entrar con tu número y tu PIN, o con Google.`
          : 'Todavía no lo activaste. Actívalo para entrar con tu número de teléfono sin usar Google.'}
      </Text>
      <Pressable style={styles.boton} onPress={() => router.push('/(auth)/nuevo-pin')}>
        <Text style={styles.botonTexto}>{tienePin ? 'Cambiar mi PIN' : 'Activar acceso con PIN'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  texto: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  boton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
});
