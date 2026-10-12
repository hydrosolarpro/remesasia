import { View, Text, StyleSheet } from 'react-native';
import { PRECIO_PLAN } from '../lib/plan';
import { useTipoCambioSunat, solesADolares } from '../lib/tipoCambio';
import { colors } from '../constants/theme';

// Contenido EXACTO de cada plan, tal como está escrito en
// "SOBRE PLANES Y PAGOS/sobre-planes.md" (fuente de verdad de contenido y
// precios) -- no se parafrasea ni se resume. Las líneas 100% idénticas
// entre planes (BENEFICIOS_COMUNES / BENEFICIOS_EXTRA) se guardan una sola
// vez para no repetir el mismo texto siete veces; el resto (acceso,
// registro de clientes, operadores) es literal por plan.
const BENEFICIOS_COMUNES = [
  'Una sesión para el operador principal de Perú, quien es el gestor del negocio con toda la información centralizada.',
  'Datos importantes para la gestión del negocio: Nombre, Logo, eslogan, datos personales (nombre y teléfono, correo), datos de plataformas digitales de transferencia de la moneda de recepción, datos de cuentas bancarias, registro de los operadores, horario de atención, tasa de la moneda de recepción/entrega, Tasa de adquisición, Tasa de Venta al cliente, % y comisiones operadores, % de rentabilidad del negocio, Comisiones y ganancia por operación y total de operaciones.',
  'Listado de operaciones para la recepción de solicitudes de los clientes finales con todos los datos requeridos para la transferencia de la remesa, resumen de operaciones, carga de imágenes de depósitos (país de recepción/país de entrega), lista de operaciones realizadas y de revisión con check de validación de recepción de pago y de validación de los depósitos en el país de entrega de remesa.',
  'Información automatiza y en tiempo real de indicaciones de fecha y hora de las operaciones, tiempo de respuesta entre operaciones en curso, realizadas, operaciones por revisión para la confirmación de validación de depósito pro los clientes y de alarma sonora en las sesiones de operadores (país recepción /país entrega) para la eficiente gestión de las remesas.',
  'Respuesta automáticas e inmediatas de las operaciones de remesa a los clientes (país recepción /país entrega_benficiarios) por vía WhatsApp y Telegram.',
  'Respuesta de información de enlaces para el acceso del equipo de operadores (país recepción /país entrega) por vía WhatsApp.',
  'Resultado de estadísticas: total de operaciones realizadas, total de montos en la moneda de recepción/entrega con su total de Ganancias, resumen de operaciones por operadores (país recepción /país entrega), reporte por día, fecha específica, rango de fechas, mes, rango de meses, año y rango de años, gráficas de las operaciones resultados tipo barra, circular y lineal.',
  'Invitaciones automáticas por vía WhatsApp usando una Landing page altamente profesional con todos las funcionalidades y beneficios del servicio para la incorporación de clientes existente (migración a la plataforma) y nuevas captaciones de clientes en el país de recepción.',
];

const BENEFICIOS_EXTRA = [
  'Exportaciones en EXCEL y PDF: Descarga de resultado de operaciones según estadísticas seleccionadas con lista su lista respectiva en formato EXCEL y PDF, descarga de gráficos de estadísticas, descarga de clientes registrados en formato EXCEL y PDF.',
  'Soporte técnico y asesorías en línea 24/7.',
  'Herramientas para el marketing orgánico e inorgánico con uso de IA. Próximamente - en creación.',
  'Mejoras continuas en programación y desarrollo Web, usabilidad, automatizaciones y herramientas e IA. Próximamente - en creación.',
];

const ACCESO_NUEVAS_FUNCIONALIDADES = 'Acceso a nuevas funcionalidades y actualizaciones – En creación continua';

interface PlanContenido {
  id: string;
  encabezado: string;
  acceso: string;
  registro: string;
  operadores: string;
  incluyeExtra: boolean;
  incluyeNuevasFuncionalidades: boolean;
}

const PLANES: PlanContenido[] = [
  {
    id: 'demo',
    encabezado: `DEMO — Totalmente GRATUITA`,
    acceso: 'Acceso completo a la plataforma digital por 7 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro hasta 50 clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
    operadores: 'Hasta 3 operadores en el país recepción y 2 operador en el país de entrega.',
    incluyeExtra: true,
    incluyeNuevasFuncionalidades: false,
  },
  {
    id: 'starter',
    encabezado: `STARTER (pago mensual S/. ${PRECIO_PLAN.starter.toFixed(0)}, 30 días)`,
    acceso: 'Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro hasta 100 clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
    operadores: 'Hasta 4 operadores en el país recepción y 2 operador en el país de entrega.',
    incluyeExtra: true,
    incluyeNuevasFuncionalidades: false,
  },
  {
    id: 'pro',
    encabezado: `PRO (pago mensual S/. ${PRECIO_PLAN.pro.toFixed(0)}, 30 días)`,
    acceso: 'Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro hasta 200 clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
    operadores: 'Hasta 6 operadores en el país recepción y 3 operador en el país de entrega.',
    incluyeExtra: true,
    incluyeNuevasFuncionalidades: false,
  },
  {
    id: 'expert',
    encabezado: `EXPERT (pago mensual S/. ${PRECIO_PLAN.expert.toFixed(0)}, 30 días)`,
    acceso: 'Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro hasta 400 clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
    operadores: 'Hasta 10 operadores en el país recepción y hasta 5 operador en el país de entrega.',
    incluyeExtra: true,
    incluyeNuevasFuncionalidades: true,
  },
  {
    id: 'avance',
    encabezado: `AVANCE (pago mensual, S/. ${PRECIO_PLAN.avance.toFixed(0)}, 30 días)`,
    acceso: 'Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro hasta 600 clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
    operadores: 'Hasta 15 operadores en el país recepción y hasta 8 operador en el país de entrega.',
    incluyeExtra: true,
    incluyeNuevasFuncionalidades: true,
  },
  {
    id: 'ultra',
    encabezado: `ULTRA (pago mensual, S/. ${PRECIO_PLAN.ultra.toFixed(0)}, 30 días)`,
    acceso: 'Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro hasta 1000 clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
    operadores: 'Hasta 20 operadores en el país recepción y hasta 10 operador en el país de entrega.',
    incluyeExtra: true,
    incluyeNuevasFuncionalidades: true,
  },
  {
    id: 'medida',
    encabezado: `A LA MEDIDA (S/ 1 por cliente / mes, 30 días)`,
    acceso: 'Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro de clientes finales según el número que contrates: la suscripción mensual se calcula sola como N° de clientes × S/ 1. Considera siempre un poco más de clientes según tu crecimiento mensual.',
    operadores:
      'Operadores en el país de recepción y de entrega según el tramo estándar equivalente a tu número de clientes (1–100 como STARTER, 101–200 como PRO, 201–400 como EXPERT, 401–600 como AVANCE, 601–1000 como ULTRA). Más de 1000 clientes: plan UNLIMITED.',
    incluyeExtra: true,
    incluyeNuevasFuncionalidades: true,
  },
  {
    id: 'unlimited',
    encabezado: `UNLIMITED (pago mensual 30 días)`,
    acceso: 'Acceso completo a la plataforma digital por 30 días continuos con acceso vía Gmail de Google con autentificación segura y automática.',
    registro:
      'Registro de clientes finales en acordado con el administrador con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
    operadores: 'Número de operadores en acordado con el administrador en el país recepción y operador en el país de entrega.',
    incluyeExtra: false,
    incluyeNuevasFuncionalidades: false,
  },
];

const PLATAFORMA_INTRO =
  'Plataforma digital en línea atractiva, colaborativa entre clientes y operadores, fácil uso y adecuada para el manejo con smartphone con respaldo de base de datos y seguridad cibernética.';

// Datos de cada plan (contenido exacto de "SOBRE PLANES Y PAGOS/sobre-planes.md").
// Ya no es una sección aparte: se muestran dentro de "Cambiar de plan" del
// perfil del Operador principal, tanto en la lista como en el paso de
// información previo a las formas de pago. Los Términos y Condiciones se
// aceptan al enviar la solicitud (ver FormularioSolicitudPlan).

/** Encabezado del plan con su precio mensual y, si hay tipo de cambio SUNAT, el equivalente en US$. */
export function encabezadoPlan(id: string): string {
  const p = PLANES.find((x) => x.id === id);
  if (!p) return id;
  const precio = PRECIO_PLAN[id];
  const u = precio !== undefined ? solesADolares(precio) : null;
  return `${p.encabezado}${u === null ? '' : ` — ≈ US$ ${u.toFixed(2)}`}`;
}

/** Lista de características del plan, tal como está en sobre-planes.md. */
export function PlanDetalle({ id }: { id: string }) {
  useTipoCambioSunat(); // re-renderiza con el equivalente en US$ cuando llega el tipo de cambio
  const p = PLANES.find((x) => x.id === id);
  if (!p) return null;
  return (
    <View style={styles.detalle}>
      <Beneficio texto={p.acceso} />
      <Beneficio texto={PLATAFORMA_INTRO} />
      <Beneficio texto={p.registro} />
      <Beneficio texto={p.operadores} />
      {BENEFICIOS_COMUNES.map((texto) => (
        <Beneficio key={texto} texto={texto} />
      ))}
      {p.incluyeExtra && BENEFICIOS_EXTRA.map((texto) => <Beneficio key={texto} texto={texto} />)}
      {p.incluyeNuevasFuncionalidades && <Beneficio texto={ACCESO_NUEVAS_FUNCIONALIDADES} />}
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
  detalle: { gap: 10 },
  beneficioRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  beneficioCheck: { color: colors.success, fontSize: 15, fontWeight: '800', marginTop: 1 },
  beneficioTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 18, flex: 1 },
});
