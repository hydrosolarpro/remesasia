import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { CONTACTO_SOPORTE } from '../lib/soporte';
import { colors, radius, APP_MAX_WIDTH_MEDIUM } from '../constants/theme';

// Política de cookies y almacenamiento local (pública, se abre sin sesión
// desde el login). Describe SOLO lo que la app usa hoy: almacenamiento
// estrictamente necesario y de preferencias; no hay cookies publicitarias,
// de analítica ni de seguimiento de terceros. Si se agrega alguna
// herramienta de analítica o publicidad, esta política debe actualizarse y
// pedirse consentimiento previo.
const FILAS: { nombre: string; para: string; tipo: string; plazo: string }[] = [
  {
    nombre: 'Sesión de acceso (token de autenticación)',
    para: 'Mantenerte conectado y reconocer tu rol (cliente u operador) sin pedirte iniciar sesión en cada pantalla.',
    tipo: 'Estrictamente necesaria',
    plazo: 'Hasta que cierres sesión o expire.',
  },
  {
    nombre: 'Invitación pendiente',
    para: 'Recordar el enlace de invitación que abriste para vincular tu cuenta al negocio correcto al terminar tu registro.',
    tipo: 'Estrictamente necesaria',
    plazo: 'Hasta completar tu registro.',
  },
  {
    nombre: 'Corredor seleccionado',
    para: 'Recordar el corredor de remesas (país de recepción y de entrega) que elegiste.',
    tipo: 'Preferencia',
    plazo: 'Hasta que lo cambies o borres los datos del sitio.',
  },
  {
    nombre: 'Alarma de solicitudes (operadores)',
    para: 'Recordar si activaste o silenciaste el aviso sonoro de nuevas solicitudes.',
    tipo: 'Preferencia',
    plazo: 'Hasta que lo cambies o borres los datos del sitio.',
  },
];

export default function Cookies() {
  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={styles.outer}>
      <View style={styles.container}>
        <Pressable onPress={volver}>
          <Text style={styles.volver}>← Volver</Text>
        </Pressable>

        <Text style={styles.titulo}>Política de cookies y almacenamiento local</Text>
        <Text style={styles.sub}>Remesas IA · Última actualización: noviembre de 2026</Text>

        <Text style={styles.h}>1. Qué son</Text>
        <Text style={styles.p}>
          Las cookies y el almacenamiento local son pequeños datos que tu navegador o dispositivo guarda para que la plataforma funcione
          correctamente. Remesas IA usa únicamente los necesarios para operar tu cuenta y recordar tus preferencias.
        </Text>

        <Text style={styles.h}>2. Qué usamos</Text>
        {FILAS.map((f) => (
          <View key={f.nombre} style={styles.fila}>
            <Text style={styles.filaDato}>{f.nombre}</Text>
            <Text style={styles.p}>
              <Text style={styles.negrita}>Para qué: </Text>
              {f.para}
            </Text>
            <Text style={styles.p}>
              <Text style={styles.negrita}>Tipo: </Text>
              {f.tipo}
            </Text>
            <Text style={styles.p}>
              <Text style={styles.negrita}>Duración: </Text>
              {f.plazo}
            </Text>
          </View>
        ))}

        <Text style={styles.h}>3. Lo que NO hacemos</Text>
        <Text style={styles.p}>
          No usamos cookies publicitarias, de analítica ni de seguimiento de terceros, ni vendemos información de tu navegación. Como solo
          usamos almacenamiento necesario y de preferencias, no te pedimos aceptar un banner de cookies; si en el futuro incorporáramos
          otras, te pediremos tu consentimiento antes.
        </Text>

        <Text style={styles.h}>4. Cómo controlarlas</Text>
        <Text style={styles.p}>
          Puedes borrar los datos del sitio desde la configuración de tu navegador o dispositivo. Ten en cuenta que, al hacerlo, se cerrará
          tu sesión y tendrás que volver a ingresar. Bloquear el almacenamiento necesario impedirá usar la plataforma.
        </Text>

        <Text style={styles.h}>5. Servicios de terceros</Text>
        <Text style={styles.p}>
          Al iniciar sesión con Google o pagar un plan con PayPal, esos servicios pueden usar sus propias cookies bajo sus políticas. Telegram
          se usa solo si decides vincular tu cuenta, para enviarte avisos.
        </Text>

        <Text style={styles.h}>6. Contacto</Text>
        <Text style={styles.p}>
          Correo: {CONTACTO_SOPORTE.email}. WhatsApp: {CONTACTO_SOPORTE.telefonoVisible}. Consulta también nuestra política de privacidad
          para conocer cómo tratamos tus datos personales.
        </Text>
        <Pressable style={styles.boton} onPress={() => router.push('/privacidad')}>
          <Text style={styles.botonTexto}>Ver política de privacidad</Text>
        </Pressable>
        <Pressable style={styles.boton} onPress={() => Linking.openURL(`mailto:${CONTACTO_SOPORTE.email}`)}>
          <Text style={styles.botonTexto}>Escribir a soporte</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { flexGrow: 1, backgroundColor: colors.bg, alignItems: 'center' },
  container: { width: '100%', maxWidth: APP_MAX_WIDTH_MEDIUM, padding: 24, gap: 10 },
  volver: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  titulo: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  sub: { color: colors.textMuted, fontSize: 13, marginBottom: 6 },
  h: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 14 },
  p: { color: colors.textMuted, fontSize: 14, lineHeight: 21, flexShrink: 1, flexWrap: 'wrap' },
  negrita: { color: colors.text, fontWeight: '700' },
  fila: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, gap: 4 },
  filaDato: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  boton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: 6 },
  botonTexto: { color: colors.accent, fontWeight: '700' },
});
