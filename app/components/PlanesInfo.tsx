import { View, Text, StyleSheet } from 'react-native';
import { DIAS_DEMO, PRECIO_PLAN, ORDEN_PLANES, LIMITES_PLAN, NOMBRE_PLAN } from '../lib/plan';
import { colors, radius, cardShadow } from '../constants/theme';
import { Collapsible } from './Collapsible';

const EMOJI_PLAN: Record<string, string> = {
  demo: '🎁',
  starter: '🚀',
  pro: '📈',
  expert: '⭐',
  avance: '🏆',
  ultra: '💎',
  unlimited: '♾️',
};

// Los beneficios son casi idénticos entre planes (ver
// "SOBRE PLANES Y PAGOS/sobre-planes.md") — solo cambian días de acceso,
// cupo de clientes y operadores, que ya se muestran en el encabezado de
// cada plan. Acá va el resto del contenido, una sola vez, sin repetirlo
// por cada plan.
const BENEFICIOS_COMUNES = [
  'Plataforma digital en línea atractiva, colaborativa entre clientes y operadores, fácil uso y adecuada para el manejo con smartphone con respaldo de base de datos y seguridad cibernética.',
  'Datos importantes para la gestión del negocio: Nombre, Logo, eslogan, datos personales, cuentas bancarias, registro de operadores, horario de atención, tasas y comisiones.',
  'Listado de operaciones con carga de comprobantes, revisión y validación de depósitos en ambos países.',
  'Alarma sonora y estado en tiempo real de las operaciones en curso, realizadas y por revisión.',
  'Respuestas automáticas e inmediatas a los clientes por WhatsApp y Telegram.',
  'Enlaces de acceso para el equipo de operadores por WhatsApp.',
  'Estadísticas y gráficas de operaciones por período, con exportación a EXCEL y PDF.',
  'Invitaciones automáticas por WhatsApp con landing page profesional para captar clientes.',
  'Soporte técnico y asesorías en línea 24/7.',
];

function precioLabelPlan(plan: string): string {
  if (plan === 'demo') return `${DIAS_DEMO} días gratis`;
  if (plan === 'ultra') return 'Monto mensual a coordinar con el administrador';
  if (plan === 'unlimited') return 'Cupos y monto acordados con el administrador';
  const precio = PRECIO_PLAN[plan];
  return precio !== undefined ? `S/ ${precio.toFixed(2)} / mes` : '';
}

function especificacionesPlan(plan: string): string {
  const limites = LIMITES_PLAN[plan];
  if (!limites) return '';
  const clientes = limites.clientes === Infinity ? 'a acordar' : limites.clientes;
  const peru = limites.peru === Infinity ? 'a acordar' : limites.peru;
  const venezuela = limites.venezuela === Infinity ? 'a acordar' : limites.venezuela;
  return `${clientes} clientes · ${peru} operador(es) en Perú · ${venezuela} en Venezuela`;
}

// Presentación comercial de los planes (distinta de la tarjeta "Tu plan",
// que muestra el estado puntual del operador): un desplegable por plan para
// que el Operador Perú compare sin tener que preguntar. Los Términos y
// Condiciones se aceptan al momento de solicitar/cambiar de plan (ver
// FormularioSolicitudPlan), no acá.
export function PlanesInfo() {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>Haz crecer tu negocio de remesas</Text>
      <Text style={styles.intro}>
        Empieza gratis y sube de plan cuando tu negocio lo pida — sin perder nada de lo que ya construiste: tus clientes, tu
        equipo y tu historial siguen intactos.
      </Text>

      {ORDEN_PLANES.map((plan) => (
        <Collapsible
          key={plan}
          titulo={`${EMOJI_PLAN[plan] ?? ''} ${NOMBRE_PLAN[plan] ?? plan.toUpperCase()} — ${precioLabelPlan(plan)}`}
          subtitulo={especificacionesPlan(plan)}
        >
          {BENEFICIOS_COMUNES.map((texto) => (
            <Beneficio key={texto} texto={texto} />
          ))}
        </Collapsible>
      ))}
    </View>
  );
}

function Beneficio({ texto }: { texto: string }) {
  return (
    <View style={styles.beneficioRow}>
      <Text style={styles.beneficioCheck}>✓</Text>
      <Text style={styles.beneficioTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    gap: 10,
  },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '900' },
  intro: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  beneficioRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  beneficioCheck: { color: colors.success, fontSize: 13, fontWeight: '800', marginTop: 1 },
  beneficioTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
});
