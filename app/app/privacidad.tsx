import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { CONTACTO_SOPORTE } from '../lib/soporte';
import { colors, radius, APP_MAX_WIDTH_MEDIUM } from '../constants/theme';

// Política de privacidad pública (se abre sin sesión, también desde el login).
// Texto alineado con la Ley N.° 29733 de Protección de Datos Personales y su
// Reglamento. Los plazos de conservación se expresan por referencia a lo que
// la ley exija, sin cifras fijas, hasta que se validen con asesoría legal.
const FILAS_DATOS: { dato: string; para: string; base: string; plazo: string }[] = [
  {
    dato: 'Nombre, teléfono, correo y país',
    para: 'Crear y operar tu cuenta y contactarte por tus operaciones.',
    base: 'Ejecución del servicio que solicitas.',
    plazo: 'Mientras tu cuenta esté activa.',
  },
  {
    dato: 'Documento de identidad (tipo, número y foto)',
    para: 'Verificar tu identidad antes de remesar y prevenir fraude y lavado de activos.',
    base: 'Obligación legal e interés legítimo en prevenir el fraude.',
    plazo: 'El plazo que la ley exija conservar los registros de operaciones; luego se elimina.',
  },
  {
    dato: 'Datos del beneficiario (nombre, documento, teléfono, banco y cuenta)',
    para: 'Ejecutar la remesa que ordenas.',
    base: 'Ejecución del servicio que solicitas.',
    plazo: 'Mientras sea necesario para el servicio y, después, el plazo legal de conservación de operaciones.',
  },
  {
    dato: 'Montos, tasas y comprobantes de pago',
    para: 'Registrar cada operación, emitir reportes y cumplir obligaciones contables y tributarias.',
    base: 'Obligación legal y ejecución del servicio.',
    plazo: 'El plazo que la ley exija (tributario y de prevención de lavado de activos).',
  },
  {
    dato: 'PIN de acceso (guardado cifrado)',
    para: 'Autenticarte de forma segura.',
    base: 'Ejecución del servicio.',
    plazo: 'Hasta que elimines tu cuenta.',
  },
  {
    dato: 'Telegram vinculado y token de notificaciones',
    para: 'Enviarte avisos de tus operaciones y avisos importantes de seguridad.',
    base: 'Tu consentimiento (puedes retirarlo cuando quieras).',
    plazo: 'Hasta que lo retires o elimines tu cuenta.',
  },
  {
    dato: 'Datos comerciales de quien solicita información (landing)',
    para: 'Responder tu consulta.',
    base: 'Tu consentimiento.',
    plazo: 'Hasta que lo solicites o deje de ser necesario para responderte.',
  },
];

export default function Privacidad() {
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

        <Text style={styles.titulo}>Política de privacidad y protección de datos</Text>
        <Text style={styles.sub}>Remesas IA · Última actualización: octubre de 2026</Text>

        <Text style={styles.h}>1. Quién es el responsable</Text>
        <Text style={styles.p}>
          El responsable del tratamiento de tus datos personales es el titular de la plataforma Remesas IA. Puedes contactarlo en{' '}
          {CONTACTO_SOPORTE.email} o por WhatsApp al {CONTACTO_SOPORTE.telefonoVisible}. Tratamos tus datos conforme a la Ley N.° 29733,
          Ley de Protección de Datos Personales, y su Reglamento.
        </Text>

        <Text style={styles.h}>2. Qué datos usamos, para qué, con qué base legal y por cuánto tiempo</Text>
        {FILAS_DATOS.map((f) => (
          <View key={f.dato} style={styles.fila}>
            <Text style={styles.filaDato}>{f.dato}</Text>
            <Text style={styles.p}>
              <Text style={styles.negrita}>Para qué: </Text>
              {f.para}
            </Text>
            <Text style={styles.p}>
              <Text style={styles.negrita}>Base legal: </Text>
              {f.base}
            </Text>
            <Text style={styles.p}>
              <Text style={styles.negrita}>Cuánto tiempo: </Text>
              {f.plazo}
            </Text>
          </View>
        ))}

        <Text style={styles.h}>3. Con quién compartimos tus datos</Text>
        <Text style={styles.p}>
          • Los operadores de tu negocio (Perú y Venezuela), solo los datos necesarios para atender tu operación.{'\n'}• Proveedores
          técnicos que actúan por nuestra cuenta: Supabase (base de datos y archivos), Vercel (alojamiento de la web), Telegram y servicios
          de notificaciones push (avisos), Google (inicio de sesión) y PayPal (pago de planes).{'\n'}• Autoridades, cuando una ley lo exija.
          {'\n'}• No vendemos tus datos ni los usamos para publicidad de terceros.
        </Text>
        <Text style={styles.p}>
          Algunos de estos proveedores procesan datos fuera del Perú (por ejemplo, en Estados Unidos). Exigimos medidas de seguridad
          adecuadas.
        </Text>

        <Text style={styles.h}>4. Tus derechos</Text>
        <Text style={styles.p}>
          Puedes, sin costo, acceder a tus datos, rectificarlos, cancelarlos (eliminarlos), oponerte a su uso y retirar tu consentimiento.
          Puedes editar tus datos desde tu Perfil. Para ejercer cualquier derecho escríbenos a {CONTACTO_SOPORTE.email} o por WhatsApp al{' '}
          {CONTACTO_SOPORTE.telefonoVisible}. Si eliminas tu cuenta, conservaremos únicamente los registros que una ley nos obligue a
          mantener, sin otro uso, hasta que venza ese plazo. Si consideras que tus derechos no fueron atendidos, puedes reclamar ante la
          Autoridad Nacional de Protección de Datos Personales.
        </Text>

        <Text style={styles.h}>5. Cómo protegemos tus datos</Text>
        <Text style={styles.p}>
          Usamos conexión cifrada (HTTPS), control de acceso por rol y por negocio a nivel de base de datos, y tu PIN se guarda cifrado.
          Solo el personal y los operadores autorizados acceden a los datos que necesitan.
        </Text>

        <Text style={styles.h}>6. Si ocurre un incidente de seguridad</Text>
        <Text style={styles.p}>
          Si ocurre un incidente que pueda afectar tus datos, te lo comunicaremos en lenguaje claro y dentro de los plazos legales, e
          informaremos a la autoridad cuando corresponda. Para recibir avisos importantes, vincula tu cuenta de Telegram desde tu Perfil (es
          necesario tener una cuenta de Telegram).
        </Text>

        <Text style={styles.h}>7. Contacto y soporte técnico 24/7</Text>
        <Text style={styles.p}>
          Correo: {CONTACTO_SOPORTE.email}. WhatsApp: {CONTACTO_SOPORTE.telefonoVisible}.
        </Text>
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
