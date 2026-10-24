import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { CONTACTO_SOPORTE, enlaceWhatsAppSoporteUrgente } from '../lib/soporte';
import { descargarMisDatos } from '../lib/exportarMisDatos';
import { colors, radius, cardShadow } from '../constants/theme';

// Bloque que va en el Perfil de TODAS las sesiones: aviso de protección de
// datos (Ley N.° 29733), acceso a la política de privacidad y soporte
// técnico 24/7 por WhatsApp con el mensaje URGENTE ya armado.
export function SoporteYPrivacidadCard() {
  const { usuario } = useAuth();
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarMisDatos();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudieron descargar tus datos.';
      if (Platform.OS === 'web') window.alert(mensaje);
      else Alert.alert('No se pudo descargar', mensaje);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.titulo}>🔒 Tus datos están protegidos</Text>
        <Text style={styles.dato}>
          Tus datos personales se tratan conforme a la Ley N.° 29733 de Protección de Datos Personales y su Reglamento y a nuestra política
          de seguridad: se usan solo para operar tu cuenta y tus remesas, con acceso restringido por rol. Tienes derecho a acceder a tus
          datos, corregirlos, eliminarlos y oponerte a su uso cuando quieras.
        </Text>
        <Pressable onPress={() => router.push('/privacidad')}>
          <Text style={styles.enlace}>Ver política de privacidad</Text>
        </Pressable>
        <Pressable style={styles.boton} onPress={descargar} disabled={descargando}>
          {descargando ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.botonTexto}>Descargar mis datos</Text>}
        </Pressable>
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.titulo}>🛟 Soporte técnico 24/7</Text>
        <Text style={styles.dato}>
          Si tienes un problema, tu solicitud será atendida a la brevedad. Envíanos un mensaje por WhatsApp marcado como URGENTE; el mensaje
          ya incluye tus datos para ubicarte rápido.
        </Text>
        {usuario && (
          <Pressable style={styles.boton} onPress={() => Linking.openURL(enlaceWhatsAppSoporteUrgente(usuario))}>
            <Text style={styles.botonTexto}>Escribir por WhatsApp (URGENTE)</Text>
          </Pressable>
        )}
        <Text style={styles.contacto}>
          WhatsApp {CONTACTO_SOPORTE.telefonoVisible} · {CONTACTO_SOPORTE.email}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800', flexShrink: 1, flexWrap: 'wrap' },
  dato: { color: colors.textMuted, fontSize: 14, flexShrink: 1, flexWrap: 'wrap' },
  enlace: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  boton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  botonTexto: { color: colors.accent, fontWeight: '700' },
  contacto: { color: colors.textMuted, fontSize: 13, flexShrink: 1, flexWrap: 'wrap' },
});
