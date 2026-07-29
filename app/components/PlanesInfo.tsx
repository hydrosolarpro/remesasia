import { View, Text, StyleSheet } from 'react-native';
import { DIAS_DEMO, PRECIO_STARTER_MENSUAL, LIMITE_CLIENTES, LIMITE_EQUIPO_PERU, LIMITE_EQUIPO_VENEZUELA } from '../lib/plan';
import { colors, radius, cardShadow } from '../constants/theme';
import { Pressable, Linking } from 'react-native';

// Presentación comercial de los planes (distinta de la tarjeta "Tu plan",
// que muestra el estado puntual del operador): explica qué incluye cada
// plan y por qué conviene pasar a STARTER, para que el propio Operador
// Perú entienda el valor sin tener que preguntar.
export function PlanesInfo() {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>Haz crecer tu negocio de remesas</Text>
      <Text style={styles.intro}>
        Empieza gratis y sube de plan cuando tu negocio lo pida — sin perder nada de lo que ya construiste: tus clientes, tu
        equipo y tu historial siguen intactos.
      </Text>

      <View style={styles.planBloque}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.planEmoji}>🎁</Text>
          <Text style={styles.planNombre}>DEMO — {DIAS_DEMO} días gratis</Text>
        </View>
        <Beneficio texto="Acceso completo a la plataforma digital por 7 días continuos con acceso vía Gmail de Google con autentificación segura y automática." />
        <Beneficio texto="Plataforma digital en línea atractiva, colaborativa entre clientes y operadores, fácil uso y adecuada para el manejo con smartphone con respaldo de base de datos y seguridad cibernética." />
        <Beneficio texto="Registro hasta 100 clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes." />
        <Beneficio texto="Hasta 2 operadores en el país recepción y 2 operador en el país de entrega." />
        <Beneficio texto="Datos importantes para la gestión del negocio: Nombre, Logo, eslogan, datos personales (nombre y teléfono, correo), datos de plataformas digitales de transferencia de la moneda de recepción, datos de cuentas bancarias, registro de los operadores, horario de atención, tasa de la moneda de recepción/entrega, % de rentabilidad y ganancia por operación y total de operaciones." />
        <Beneficio texto="Listado de operaciones para la recepción de solicitudes de los clientes finales con todos los datos requeridos para la transferencia de la remesa, resumen de operaciones, carga de imágenes de depósitos (país de recepción/país de entrega), lista de operaciones realizadas y de revisión con check de validación de recepción de pago y de validación de los depósitos en el país de entrega de remesa." />
        <Beneficio texto="Información automatiza y en tiempo real de indicaciones de fecha y hora de las operaciones, tiempo de respuesta entre operaciones en curso, realizadas, operaciones por revisión para la confirmación de validación de depósito pro los clientes y de alarma sonora en las sesiones de operadores (país recepción /país entrega) para la eficiente gestión de las remesas." />
        <Beneficio texto="Respuesta automáticas e inmediatas de las operaciones de remesa a los clientes (país recepción /país entrega_benficiarios) por vía WhatsApp y Telegram." />
        <Beneficio texto="Respuesta de información de enlaces para el acceso del equipo de operadores (país recepción /país entrega) por vía WhatsApp." />
        <Beneficio texto="Resultado de estadísticas: total de operaciones realizadas, total de montos en la moneda de recepción/entrega con su total de Ganancias, resumen de operaciones por operadores (país recepción /país entrega), reporte por día, fecha específica, rango de fechas, mes, rango de meses, año y rango de años, gráficas de las operaciones resultados tipo barra, circular y lineal." />
        <Beneficio texto="Invitaciones automáticas por vía WhatsApp usando una Landing page altamente profesional con todos las funcionalidades y beneficios del servicio para la incorporación de clientes existente (migración a la plataforma) y nuevas captaciones de clientes en el país de recepción." />
        <Beneficio texto="Exportaciones en formato EXCEL y PDF: Descarga de resultado de operaciones según estadísticas seleccionadas con lista su lista respectiva, descarga de gráficos de estadísticas, descarga de clientes registrados." />
        <Beneficio texto="Soporte técnico y asesorías en línea 24/7." />
        <Beneficio texto="Herramientas para el marketing orgánico e inorgánico con uso de IA. Próximamente - en creación." />
        <Beneficio texto="Mejoras continuas en programación y desarrollo Web, usabilidad, automatizaciones y herramientas e IA. Próximamente - en creación." />
        <Beneficio texto="Arma tu equipo en Venezuela y en Perú para probar el flujo real de principio a fin." />
        <Beneficio texto="Sin tarjeta ni pagos por adelantado — se activa solo con tu registro." />
      </View>

      <View style={[styles.planBloque, styles.planDestacado]}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.planEmoji}>🚀</Text>
          <Text style={styles.planNombre}>STARTER — S/. {PRECIO_STARTER_MENSUAL.toFixed(2)} / mes</Text>
        </View>
        <Text style={styles.planSubtitulo}>Para el negocio de inicio rápido y pasar de la atención manual a la atención digital y automática.</Text>
        <Beneficio texto="Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática." destacado />
        <Beneficio texto="Plataforma digital en línea atractiva, colaborativa entre clientes y operadores, fácil uso y adecuada para el manejo con smartphone con respaldo de base de datos y seguridad cibernética." destacado />
        <Beneficio texto={`Registro hasta ${LIMITE_CLIENTES} clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes. `} destacado />
        <Beneficio texto={`Hasta ${LIMITE_EQUIPO_PERU} operador en el país recepción (aparte de ti) y ${LIMITE_EQUIPO_VENEZUELA} operadores en el país de entrega. `} destacado />
        <Beneficio texto="Datos importantes para la gestión del negocio: Nombre, Logo, eslogan, datos personales (nombre y teléfono, correo), datos de plataformas digitales de transferencia de la moneda de recepción, datos de cuentas bancarias, registro de los operadores, horario de atención, tasa de la moneda de recepción/entrega, % de rentabilidad y ganancia por operación y total de operaciones. " destacado />
        <Beneficio texto="Listado de operaciones para la recepción de solicitudes de los clientes finales con todos los datos requeridos para la transferencia de la remesa, resumen de operaciones, carga de imágenes de depósitos (país de recepción/país de entrega), lista de operaciones realizadas y de revisión con check de validación de recepción de pago y de validación de los depósitos en el país de entrega de remesa." destacado />
        <Beneficio texto="Información automatiza y en tiempo real de indicaciones de fecha y hora de las operaciones, tiempo de respuesta entre operaciones en curso, realizadas, operaciones por revisión para la confirmación de validación de depósito pro los clientes y de alarma sonora en las sesiones de operadores (país recepción /país entrega) para la eficiente gestión de las remesas." />
        <Beneficio texto="Respuesta automáticas e inmediatas de las operaciones de remesa a los clientes (país recepción /país entrega_benficiarios) por vía WhatsApp y Telegram." destacado />
        <Beneficio texto="Respuesta de información de enlaces para el acceso del equipo de operadores (país recepción /país entrega) por vía WhatsApp." />
        <Beneficio texto="Resultado de estadísticas: total de operaciones realizadas, total de montos en la moneda de recepción/entrega con su total de Ganancias, resumen de operaciones por operadores (país recepción /país entrega), reporte por día, fecha específica, rango de fechas, mes, rango de meses, año y rango de años, gráficas de las operaciones resultados tipo barra, circular y lineal." destacado />
        <Beneficio texto="Invitaciones automáticas por vía WhatsApp usando una Landing page altamente profesional con todos las funcionalidades y beneficios del servicio para la incorporación de clientes existente (migración a la plataforma) y nuevas captaciones de clientes en el país de recepción." destacado />
        <Beneficio texto="Exportaciones en formato EXCEL y PDF: Descarga de resultado de operaciones según estadísticas seleccionadas con lista su lista respectiva, descarga de gráficos de estadísticas, descarga de clientes registrados." destacado />
        <Beneficio texto="Soporte técnico y asesorías en línea 24/7." destacado />
        <Beneficio texto="Herramientas para el marketing orgánico e inorgánico con uso de IA. Próximamente - en creación." destacado />
        <Beneficio texto="Mejoras continuas en programación y desarrollo Web, usabilidad, automatizaciones y herramientas e IA. Próximamente - en creación." destacado />
        <Text style={styles.cierre}>
          Con {LIMITE_CLIENTES} clientes activos y comisión por remesa, STARTER se paga solo desde las primeras operaciones del mes.
        </Text>

          <View style={styles.terminosBox}>
  <Text style={styles.terminosTitulo}>
    Términos y condiciones de uso de la plataforma Remesas PERÚ-VENEZUELA
  </Text>

  <Text style={styles.terminosTexto}>
    Importante: antes de activar tu suscripción debes leer cuidadosamente los
    Términos y Condiciones de Uso de la plataforma. Al marcar la aceptación
    declaras que has leído, comprendido y aceptado íntegramente dicho
    documento, el cual constituye el acuerdo legal que regula el uso de la
    plataforma.
  </Text>

  <Pressable
    onPress={() =>
      Linking.openURL('/legal/terminos-legales-remesas-peru-venezuela.pdf')
    }
  >
    <Text style={styles.linkPdf}>
      📄 Descargar TÉRMINOS LEGALES Y DE USO DE REMESAS PERÚ-VENEZUELA (PDF)
    </Text>
  </Pressable>

  <View style={styles.beneficioRow}>
    <Text style={styles.beneficioCheck}>☐</Text>
    <Text style={styles.beneficioTexto}>
      He leído y acepto los Términos y Condiciones de Uso. Una vez aceptados,
      esta autorización será registrada y no podrá deshabilitarse.
    </Text>
  </View>
</View>
        
      </View>
    </View>
  );
}



function Beneficio({ texto, destacado }: { texto: string; destacado?: boolean }) {
  return (
    <View style={styles.beneficioRow}>
      <Text style={[styles.beneficioCheck, destacado && styles.beneficioCheckDestacado]}>✓</Text>
      <Text style={styles.beneficioTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '900' },
  intro: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  planBloque: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  planDestacado: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planEmoji: { fontSize: 18 },
  planNombre: { color: colors.text, fontSize: 15, fontWeight: '800' },
  planSubtitulo: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 2 },
  beneficioRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  beneficioCheck: { color: colors.textMuted, fontSize: 13, fontWeight: '800', marginTop: 1 },
  beneficioCheckDestacado: { color: colors.success },
  beneficioTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  cierre: { color: colors.text, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 6, fontStyle: 'italic' },

terminosBox: {
  marginTop: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: colors.primary,
  borderRadius: radius.sm,
  backgroundColor: '#FFFBEA',
},

terminosTitulo: {
  color: colors.text,
  fontSize: 14,
  fontWeight: '800',
  marginBottom: 8,
},

terminosTexto: {
  color: colors.textMuted,
  fontSize: 13,
  lineHeight: 18,
  marginBottom: 12,
},

linkPdf: {
  color: '#0066CC',
  fontSize: 13,
  fontWeight: '700',
  textDecorationLine: 'underline',
  marginBottom: 12,
},
});
