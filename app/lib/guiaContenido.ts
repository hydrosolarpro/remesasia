export interface PasoGuia {
  icono: string;
  titulo: string;
  texto: string;
  /** Quién ejecuta este paso -- solo se usa en GUIA_FLUJO_COMPLETO, para el esquema visual del flujo en el Panel del principal. */
  actor?: 'cliente' | 'operadores';
}

// Contenido tomado de "funcionaldiades - flujo remesas peru-venezuela.pdf"
// -- un paso por cada pantalla/función principal de cada sesión, resumido
// para leerse rápido en un modal. Se muestra una sola vez, la primera vez
// que ese rol entra a su sesión (ver GuiaPasoAPaso y usuarios.guia_vista_at
// en supabase/migrations/0083_guia_paso_a_paso.sql).

export const GUIA_OPERADOR_PRINCIPAL: PasoGuia[] = [
  {
    icono: '👋',
    titulo: 'Eres el Operador principal de Perú',
    texto:
      'Eres el dueño de este negocio de remesas. Desde aquí manejas todo: tu equipo, tus clientes, la tasa del día y todas las operaciones entre Perú y Venezuela.',
  },
  {
    icono: '🏢',
    titulo: 'Configura tu negocio',
    texto:
      'En Perfil puedes registrar el nombre y logo de tu negocio, tus teléfonos de Yape/Plin, tus cuentas bancarias y tu horario de atención. Todo queda editable cuando quieras.',
  },
  {
    icono: '📊',
    titulo: 'Panel — el corazón de tu operación',
    texto:
      'Aquí publicas tu Tasa de adquisición y tu Tasa del día (Soles → Bolívares), y ves todas las operaciones en tiempo real: En curso, Realizadas y Por revisar.',
  },
  {
    icono: '✅',
    titulo: 'Validar depósitos',
    texto:
      'Cuando un cliente deposita en Perú, validas su comprobante y la app le avisa por Telegram al instante. También puedes validar tú mismo la transferencia a Venezuela, o derivar la operación a un operador de tu equipo en Perú.',
  },
  {
    icono: '📈',
    titulo: 'Estadísticas',
    texto:
      'Consulta el número de operaciones, montos en Soles y Bolívares, ganancia bruta y neta, y la comisión de cada operador de tu equipo (Perú y Venezuela) — con gráficos y descargas en Excel y PDF.',
  },
  {
    icono: '👥',
    titulo: 'Clientes',
    texto:
      'Invita a tus clientes compartiendo tu enlace por WhatsApp. Verás tu cupo de clientes según tu plan, y podrás derivar cualquier cliente a un operador de tu equipo en Perú.',
  },
  {
    icono: '🧑‍💼',
    titulo: 'Tu equipo',
    texto:
      'En Perfil agregas y administras a tus Operadores de Venezuela y de Perú miembro: nombre, teléfono, correo, % de comisión, y a qué Operador de Venezuela atiende cada uno. También puedes dejarle libre a un miembro su propia Tasa del día.',
  },
  {
    icono: '📱',
    titulo: 'Todo queda a un toque',
    texto:
      'Desde Perfil puedes instalar la app en tu celular con acceso directo desde la pantalla de inicio, y enviar esa guía de instalación por WhatsApp o Telegram a tu equipo o tus clientes.',
  },
];

export const GUIA_OPERADOR_MIEMBRO: PasoGuia[] = [
  {
    icono: '👋',
    titulo: 'Eres Operador de Perú miembro',
    texto:
      'El Operador principal de Perú te agregó a su equipo. Ingresa siempre con el correo Gmail exacto con el que te registró.',
  },
  {
    icono: '📊',
    titulo: 'Tu Panel',
    texto:
      'Ves la Tasa del día que publica el principal, y si te habilitó la opción, también puedes publicar tu propia Tasa del día — aplica solo a tus propios clientes.',
  },
  {
    icono: '✅',
    titulo: 'Tus operaciones',
    texto:
      'Ves en tiempo real tus operaciones En curso, Realizadas, Por revisar y las que el principal te haya Derivado. Validas el depósito de tus clientes en Perú y la app le avisa por Telegram automáticamente.',
  },
  {
    icono: '💰',
    titulo: 'Tu comisión',
    texto: 'En el Panel ves "Mi comisión (hoy)": el monto total de tus operaciones y lo que ganaste en Soles.',
  },
  {
    icono: '📈',
    titulo: 'Estadísticas',
    texto:
      'Consulta el número de tus operaciones, montos enviados y tu comisión, con gráficos y descargas en Excel y PDF.',
  },
  {
    icono: '👥',
    titulo: 'Tus clientes',
    texto:
      'Invita a tus propios clientes compartiendo tu enlace por WhatsApp. Verás el cupo disponible del plan del negocio y tus clientes registrados.',
  },
  {
    icono: '📱',
    titulo: 'Tu Perfil',
    texto:
      'Ahí ves tu % de comisión asignada por el principal, y puedes instalar la app en tu celular con acceso directo desde la pantalla de inicio.',
  },
];

export const GUIA_OPERADOR_VENEZUELA: PasoGuia[] = [
  {
    icono: '👋',
    titulo: 'Eres Operador de Venezuela',
    texto:
      'El Operador principal de Perú te registró. Ingresa siempre con el correo Gmail exacto con el que te registró.',
  },
  {
    icono: '📊',
    titulo: 'Tu Panel',
    texto:
      'Ves la Tasa del día, el horario de atención del negocio, y tus operaciones en tiempo real: En curso, Realizadas y Por revisar — solo las de los operadores de Perú que te asignaron.',
  },
  {
    icono: '✅',
    titulo: 'Validar la transferencia',
    texto:
      'Cuando el depósito ya fue validado en Perú, realizas la transferencia al beneficiario y subes tu comprobante. La app avisa automáticamente por Telegram al cliente y al beneficiario, con la imagen de la transferencia.',
  },
  {
    icono: '💰',
    titulo: 'Tu comisión',
    texto: 'En el Panel ves "Mi comisión (hoy)": el monto total de tus operaciones y lo que ganaste en Bolívares y Soles.',
  },
  {
    icono: '📈',
    titulo: 'Estadísticas',
    texto:
      'Consulta el número de tus operaciones, montos y tu comisión en VES y PEN, con gráficos y descargas en Excel y PDF.',
  },
  {
    icono: '📱',
    titulo: 'Tu Perfil',
    texto:
      'Ahí ves tu % de comisión asignada, y puedes instalar la app en tu celular con acceso directo desde la pantalla de inicio.',
  },
];

export const GUIA_CLIENTE: PasoGuia[] = [
  {
    icono: '👋',
    titulo: '¡Bienvenido!',
    texto:
      'Accediste mediante el enlace de tu operador y quedaste vinculado a él — todas tus solicitudes las atenderá su equipo.',
  },
  {
    icono: '💸',
    titulo: 'Nueva solicitud',
    texto:
      'En Inicio ves la Tasa del día y las tasas del BCV en tiempo real. Escribe el monto en Soles, o usa el convertidor de Dólares/Euros, y verás al instante cuánto recibirá tu beneficiario en Bolívares.',
  },
  {
    icono: '📝',
    titulo: 'Completa y envía',
    texto:
      'Ingresa los datos de tu beneficiario en Venezuela (o elige uno guardado), revisa los datos para pagar en Perú, sube la foto de tu depósito y envía tu solicitud.',
  },
  {
    icono: '📋',
    titulo: 'Solicitudes',
    texto:
      'Ahí ves tus operaciones en curso y las realizadas hoy, con el estado de validación paso a paso: pago validado en Perú y depósito en Venezuela.',
  },
  {
    icono: '👤',
    titulo: 'Cuentas',
    texto:
      'Guarda los datos de tus beneficiarios para no volver a escribirlos, y vincula su Telegram para que reciba el aviso apenas le llegue su depósito.',
  },
  {
    icono: '📈',
    titulo: 'Estadísticas',
    texto: 'Consulta el historial completo de tus depósitos, con filtros por fecha y descargas en Excel o PDF.',
  },
  {
    icono: '🔔',
    titulo: 'Tu Perfil',
    texto:
      'Elige cómo prefieres recibir tus avisos (WhatsApp, Telegram o ambos), y puedes instalar la app en tu celular con acceso directo desde la pantalla de inicio.',
  },
];

// Solo se agrega al final de la guía del Operador principal de Perú: es
// quien necesita entender el flujo completo de las 3 sesiones (Cliente,
// Perú y Venezuela) para poder supervisar todo el negocio.
export const GUIA_FLUJO_COMPLETO: PasoGuia[] = [
  {
    icono: '🔄',
    titulo: 'El flujo completo, en 4 pasos',
    texto: 'Como dueño del negocio, esto es lo que pasa detrás de cada remesa, de principio a fin.',
  },
  {
    icono: '1️⃣',
    titulo: 'El cliente solicita',
    texto: 'El cliente en Perú, ya registrado, ingresa el monto y los datos de su beneficiario, y envía su solicitud con el comprobante de su depósito.',
    actor: 'cliente',
  },
  {
    icono: '2️⃣',
    titulo: 'Perú valida',
    texto:
      'La solicitud llega como "En curso" al Operador de Perú (principal o miembro), que valida el depósito en Soles. La app avisa al cliente por Telegram al instante. Desde aquí también se puede derivar la operación al equipo, o validar directo la transferencia a Venezuela.',
    actor: 'operadores',
  },
  {
    icono: '3️⃣',
    titulo: 'Venezuela transfiere',
    texto:
      'El Operador de Venezuela recibe la operación ya validada, hace la transferencia al beneficiario y sube su comprobante. La operación pasa a "Realizada" y la app avisa por Telegram al beneficiario y al cliente, con la imagen de la transferencia.',
    actor: 'operadores',
  },
  {
    icono: '4️⃣',
    titulo: 'El cliente confirma',
    texto:
      'El cliente confirma que su beneficiario recibió el dinero, o marca "No ha llegado". Si no llegó, la operación pasa a "Por revisar" hasta que un operador la resuelva y recargue el comprobante — ahí vuelve a quedar como "Realizada".',
    actor: 'cliente',
  },
];
