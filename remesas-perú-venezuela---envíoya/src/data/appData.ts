import { FAQItem, FeatureCardItem, PaymentMethod, VenezuelanBank } from '../types';

// Enlace de invitación de este operador Perú (José Silva / "Remesas") en la
// app real (remesasia.vercel.app). Es único y permanente: cualquiera que
// inicie sesión con Google a través de él queda vinculado automáticamente
// como cliente de este negocio (ver app/lib/invitaciones.ts -> canjear_invitacion).
export const CLIENT_APP_LINK = 'https://remesasia.vercel.app/invitacion/0bc684d1c75a400aa9b6cbd45d76dda4';

export const CURRENT_EXCHANGE_RATE = 11.25; // 1 PEN = 11.25 VES

export const PERU_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'yape', name: 'Yape', iconName: 'Smartphone', badge: 'Popular • Instantáneo' },
  { id: 'plin', name: 'Plin', iconName: 'Zap', badge: 'Sin comisión' },
  { id: 'bcp', name: 'BCP Perú', iconName: 'Building2', badge: 'Transferencia' },
  { id: 'interbank', name: 'Interbank', iconName: 'CreditCard', badge: 'CCI Directo' },
  { id: 'bbva', name: 'BBVA Perú', iconName: 'Building', badge: 'Banca Móvil' },
];

export const VENEZUELA_BANKS: VenezuelanBank[] = [
  { id: 'bdv', code: '0102', name: 'Banco de Venezuela' },
  { id: 'banesco', code: '0134', name: 'Banesco Banco Universal' },
  { id: 'mercantil', code: '0105', name: 'Banco Mercantil' },
  { id: 'provincial', code: '0108', name: 'BBVA Provincial' },
  { id: 'bancamiga', code: '0172', name: 'Bancamiga' },
  { id: 'bNC', code: '0191', name: 'Banco Nacional de Crédito (BNC)' },
  { id: 'pago_movil', code: 'PAGO_MOVIL', name: 'Pago Móvil Interbancario (Todos)' },
];

export const FEATURES_DATA: FeatureCardItem[] = [
  {
    id: 'panel_solicitudes',
    title: 'Panel Informativo para Enviar Solicitudes',
    description: 'Gestiona tus solicitudes de envío desde un panel claro e intuitivo, con todos los detalles ordenados.',
    iconName: 'LayoutDashboard',
  },
  {
    id: 'conversion_soberanos',
    title: 'Conversión Automática a Bolívares Soberanos',
    description: 'Calculadora de conversión instantánea de soles a bolívares soberanos con tasa en tiempo real.',
    iconName: 'Calculator',
  },
  {
    id: 'tasa_bcv',
    title: 'Info de Tasa BCV y Conversión Transparente',
    description: 'Información oficial de la tasa BCV y la conversión exacta respectiva del dinero enviado.',
    iconName: 'TrendingUp',
  },
  {
    id: 'seguimiento_beneficiarios',
    title: 'Seguimiento, Beneficiarios y Estadísticas',
    description: 'Seguimiento de tu remesa con registro detallado de beneficiarios en Venezuela y estadísticas de tus envíos.',
    iconName: 'Users',
  },
  {
    id: 'aviso_auto',
    title: 'Aviso Automático Instantáneo',
    description: 'La plataforma te avisa sola cuando tu pago es procesado. Tu familiar recibe su confirmación al instante.',
    iconName: 'Bell',
  },
  {
    id: 'soporte_humano',
    title: 'Soporte Humano Real',
    description: 'Equipo responsable y confiable de operadores con experiencia verificable de muchos años en el servicio de remesas Perú a Venezuela. Pensado en un uso sin complicaciones.',
    iconName: 'MessageSquare',
  },
];

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    question: '¿Es seguro enviar por Remesas PERÚ-VENEZUELA?',
    answer:
      'Totalmente seguro. Operamos bajo estándares de encriptación bancaria y alta seguridad digital. Cada transacción genera un comprobante digital único con código de seguimiento en tiempo real.',
  },
  {
    id: 'faq-2',
    question: '¿Cuánto tarda en llegar el dinero a Venezuela?',
    answer:
      'El 95% de nuestras operaciones se efectúan entre 3 y 12 minutos a través de Pago Móvil o transferencia bancaria directa a bolívares soberanos.',
  },
  {
    id: 'faq-3',
    question: '¿Mi familiar necesita instalar una app?',
    answer:
      '¡No! Tu familiar no necesita descargar nada ni registrarse. Recibe la notificación con el monto y número de referencia de forma directa.',
  },
  {
    id: 'faq-4',
    question: '¿Cómo funciona el registro de beneficiarios y estadísticas?',
    answer:
      'Puedes guardar los datos de tus familiares en Venezuela para futuros envíos más rápidos y consultar las estadísticas de tus giros acumulados en tu historial.',
  },
  {
    id: 'faq-5',
    question: '¿Qué bancos puedo utilizar en Perú y Venezuela?',
    answer:
      'En Perú aceptamos Yape, Plin, BCP, Interbank y BBVA. En Venezuela enviamos a Banco de Venezuela, Banesco, Mercantil, Provincial, Bancamiga, BNC y Pago Móvil.',
  },
];
