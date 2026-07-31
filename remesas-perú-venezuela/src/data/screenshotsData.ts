import { ScreenshotItem } from '../types';

export const OPERADOR_PERU_SCREENSHOTS: ScreenshotItem[] = [
  {
    id: 'op-pe-1',
    title: 'Panel Principal & Resumen de Hoy',
    category: 'operador_peru',
    tag: 'Panel General',
    badgeText: 'Vista Operador PE',
    description: 'Control diario de horario de atención, toggle de rentabilidad compartida con Operador Venezuela y resumen de ganancias instantáneo.',
    details: [
      'Compartir rentabilidad con Operador Venezuela (Activable)',
      'Compartir rentabilidad con miembros Operador Perú',
      'Horario de atención configurable (ej. 9:00 - 21:00)',
      'Eslogan personalizado: "Ahora Venezuela libre y se volverá a levantar 💪"',
      'Métricas en tiempo real: 1 Operación realizada hoy (S/ 50.00), Ganancia S/ 2.50'
    ],
    mockData: {
      montoSoles: 50.00,
      ganancia: 'S/ 2.50',
      rentabilidad: '5%',
      operacionesCount: 1
    },
    keyFeatures: ['Toggles de Rentabilidad', 'Horarios Personalizables', 'Resumen en Vivo', 'Eslogan de Marca']
  },
  {
    id: 'op-pe-2',
    title: 'Estadísticas de Operaciones & Filtro de Fechas',
    category: 'operador_peru',
    tag: 'Reportes & Fechas',
    badgeText: 'Estadísticas Diarias',
    description: 'Búsqueda por fecha específica, rango de fechas o mes completo con cálculo automático de volumen de dinero y ganancia por operador.',
    details: [
      'Búsqueda por fecha específica, rango de fechas o mes',
      'Desglose por miembro del equipo en Perú (ej. Jose Silva: 2 op - S/ 500.00)',
      'Desglose por miembro en Venezuela (ej. Sin registrar: 1 op - S/ 50.00)',
      'Botonera directa de descarga de reporte en formato PDF oficial'
    ],
    mockData: {
      montoSoles: 500.00,
      ganancia: 'S/ 25.00',
      rentabilidad: '5%',
      operacionesCount: 2,
      equipoPeru: 'Jose Silva (2 op · S/ 500.00)',
      equipoVenezuela: 'Jose Silva (1 op) / Sin registrar (1 op)'
    },
    keyFeatures: ['Filtro Multifecha', 'Auditoría por Operador', 'Cálculo % Rentabilidad', 'Exportación PDF']
  },
  {
    id: 'op-pe-3',
    title: 'Gráfico Interactivo de Monto vs Período (Julio 2026)',
    category: 'operador_peru',
    tag: 'Gráficos de Operaciones',
    badgeText: 'Análisis Visual',
    description: 'Visualización gráfica de barras, circular o líneas. Resumen mensual con 17 operaciones por un total de S/ 3,019.00 y S/ 150.95 de ganancia.',
    details: [
      'Visualización interactiva: Barras / Circular / Línea',
      'Sueldos e historial acumulado: 17 Operaciones | S/ 3,019.00 procesados',
      'Rentabilidad promedio del 5% (S/ 150.95 ganancia limpia)',
      'Descarga individual de gráficos o exportación completa de los 3 PDF'
    ],
    mockData: {
      montoSoles: 3019.00,
      ganancia: 'S/ 150.95',
      rentabilidad: '5%',
      operacionesCount: 17
    },
    keyFeatures: ['Gráficos de Barras/Líneas', 'Acumulado Mensual', 'Doble Exportación PDF', 'Filtro por Período']
  },
  {
    id: 'op-pe-4',
    title: 'Desglose Detallado por Miembro de Equipo',
    category: 'operador_peru',
    tag: 'Gestión de Equipo',
    badgeText: 'Control de Rendimiento',
    description: 'Monitoreo de validación de depósitos en Perú y acreditación en Venezuela asignado individualmente a cada colaborador.',
    details: [
      'Operador Perú (validó depósito en Perú): Jose Silva - 17 op · S/ 3019.00',
      'Operador Venezuela (validó depósito en VE): Sin registrar 15 op (S/ 2469.00), Jose Silva 2 op (S/ 550.00)',
      'Control de transparencia y auditoría anti-fraude'
    ],
    mockData: {
      montoSoles: 3019.00,
      equipoPeru: 'Jose Silva (17 op)',
      equipoVenezuela: 'Sin registrar (15 op) / Jose Silva (2 op)'
    },
    keyFeatures: ['Auditoría Cruzada PE/VE', 'Registro de Depositos', 'Seguridad Multiusuario', 'Métricas de Asignación']
  },
  {
    id: 'op-pe-5',
    title: 'Tasa del Día (Soles → Bolívares) & Configuración',
    category: 'operador_peru',
    tag: 'Tasa & Cambio',
    badgeText: 'Soles → Bolívares',
    description: 'Control total de la tasa diaria configurada en Bs 235 por sol. Actualización en un clic para todo el equipo.',
    details: [
      'Publicación de la tasa del día "Soles ➔ Bs"',
      'Registro de los datos bancarios y plataforma de pago digital para los depósitos en Soles, entre otras funcionalidades',
      'Botón "Actualizar tasa →" con propagación inmediata a clientes',
      'Indicador de Rentabilidad actual (5%) y Operaciones realizadas hoy (1)',
      'Ajuste rápido de horario de atención al cliente'
    ],
    mockData: {
      tasa: 235,
      rentabilidad: '5%',
      operacionesCount: 1
    },
    keyFeatures: ['Tasa en Tiempo Real', 'Propagación Instantánea', 'Control de Margen', 'Gestión de Horarios']
  },
  {
    id: 'op-pe-6',
    title: 'Perfil de Usuario & Link Único de Invitación a Clientes',
    category: 'operador_peru',
    tag: 'Perfil & Invitación',
    badgeText: 'Captación de Clientes',
    description: 'Generación automática de un enlace de invitación único por WhatsApp. Los clientes ingresan directamente vinculados a tu negocio.',
    details: [
      'Datos del operador: Jose Silva (josesilvacastillo2019@gmail.com | +51960442025)',
      'Enlace de clientes: https://remesasia.vercel.app/invitacion/0bc...',
      'Acceso DEMO 7 días gratis con autenticación segura vía Google',
      'Respaldo automático de base de datos e historial de clientes intacto al escalar de plan'
    ],
    mockData: {
      telegramUser: 'Jose Silva (+51960442025)'
    },
    keyFeatures: ['Link Único WhatsApp', 'Autenticación Google', 'Respaldo Cloud', 'Migración Transparente']
  },
  {
    id: 'op-pe-7',
    title: 'Gestión de Equipo de Operadores en Perú & Venezuela',
    category: 'operador_peru',
    tag: 'Multi-Operador',
    badgeText: 'Límites & Roles',
    description: 'Administración de colaboradores por país con validación de límites según el plan contratado.',
    details: [
      'OPERADORES EN VENEZUELA (1/2): Jose Silva (+51960442025 | jsilvacorpoelec@gmail.com)',
      'OPERADORES EN PERÚ (1/1): Cheo (960442025 | sematicerplus@gmail.com)',
      'Alerta interactiva: "Alcanzaste el límite de 1 miembro de equipo en Perú de tu plan."',
      'Botón para editar datos del negocio e invitar nuevos colaboradores'
    ],
    mockData: {
      equipoPeru: 'Cheo (1/1)',
      equipoVenezuela: 'Jose Silva (1/2)'
    },
    keyFeatures: ['Control de Equipos PE/VE', 'Límites por Plan', 'Envío de Mensajes', 'Aviso de Cupo']
  },
  {
    id: 'op-pe-8',
    title: 'Telegram ChatBot (@RemesasPV_bot) - Notificaciones Automáticas',
    category: 'operador_peru',
    tag: 'Notificaciones Telegram',
    badgeText: 'ChatBot Automatizado',
    description: 'Bot de Telegram integrado que confirma automáticamente depósitos validados en Perú y transferencias en Venezuela.',
    details: [
      'Confirmación al instante: "Tu depósito de S/ 450.00 fue validado."',
      'Notificación de transferencia exitosa: "Se ha transferido a su cuenta 0012452316595 del Banco de Venezuela por Bs 11,750.00."',
      'Sincronización automática mediante comando /start',
      'Sin intervención manual necesaria para mantener informado al cliente'
    ],
    mockData: {
      montoSoles: 450.00,
      montoBolivares: 11750.00,
      bancoDestino: 'Banco de Venezuela',
      telegramUser: 'RemesasPV_bot'
    },
    keyFeatures: ['Integración Telegram Bot', 'Confirmación de Depósito', 'Comprobante de Transferencia', '0% Error de Tipografía']
  },
  {
    id: 'op-pe-9',
    title: 'Historial de Operaciones Realizadas & Exportación Excel',
    category: 'operador_peru',
    tag: 'Operaciones & Excel',
    badgeText: 'Historial & Filtros',
    description: 'Buscador inteligente por nombre, teléfono, fecha, monto o año con etiquetas de estado [PE] [VE] y exportación Excel.',
    details: [
      'Buscador integrado por nombre, teléfono, fecha, monto o año',
      'Identificador de operación: #17 · 29/7, 06:54 a.m. José Alfredo Silva Castillo S/ 50.00 [PE] [VE]',
      'Botonera directa de exportación a archivo Excel',
      'Filtros por operaciones en curso, realizadas hoy y por revisar'
    ],
    mockData: {
      operacionesCount: 17,
      montoSoles: 50.00
    },
    keyFeatures: ['Buscador Multicriterio', 'Exportación Excel Instantánea', 'Badges PE/VE', 'Control de Estado']
  },
  {
    id: 'op-pe-10',
    title: 'Detalle Completo de Operación #17 (Yape → Banco de Venezuela)',
    category: 'operador_peru',
    tag: 'Validación & WhatsApp',
    badgeText: 'Depósito & Pago VE',
    description: 'Comprobante completo con datos del beneficiario, número de cédula, pago por Yape (S/ 50.00) y abono en Venezuela (Bs 11,750.00).',
    details: [
      'Cliente: José Alfredo Silva Castillo (960442025 | hydrosolarpro@gmail.com)',
      'Beneficiario VE: Rodrigo Silva | C.I. 32456789 | Banco de Venezuela | N° 0012452316595',
      'Forma de pago Perú: Yape (S/ 50.00) | Recibe: Bs 11,750.00 | Tiempo respuesta: 6 min',
      'Depósito validado en Perú (29/7, 07:02 a.m. por Jose Silva) & Depósito transferido en VE (08:08 a.m.)',
      'Botón con un clic: "Notificar por WhatsApp al beneficiario"'
    ],
    mockData: {
      montoSoles: 50.00,
      montoBolivares: 11750.00,
      bancoDestino: 'Banco de Venezuela',
      metodoPago: 'Yape / Banco de Venezuela'
    },
    keyFeatures: ['Validación en 2 Pasos', 'Copia Rápida de Datos', 'Comprobante Yape/VE', 'Notificación WhatsApp 1-Clic']
  }
];

export const OPERADOR_VENEZUELA_PREVIEWS: ScreenshotItem[] = [
  {
    id: 'op-ve-1',
    title: 'Panel Operador Venezuela (Modo Solo Lectura & Tasa)',
    category: 'operador_venezuela',
    tag: 'Panel General VE',
    badgeText: '🇻🇪 Operador Venezuela',
    description: 'Vista dedicada para el colaborador en Venezuela: banner "🇻🇪 Operador Venezuela · Solo lectura", Tasa del día Bs 235, resumen de operaciones hoy (1 op) y estado del negocio.',
    details: [
      'Banner explicativo de rol: "🇻🇪 Operador Venezuela · Solo lectura"',
      'Tasa de cambio del día: Bs 235 (Soles a Bolívares)',
      'Control de horario de atención: 9:00 - 21:00',
      'Pestañas de estado: Operaciones en Curso (0), Realizadas Hoy (1), Por Revisar (0)',
      'Eslogan de marca: "Ahora Venezuela libre y se volverá a levantar 💪"'
    ],
    mockData: {
      tasa: 235,
      operacionesCount: 1,
      montoSoles: 50.00,
      ganancia: 'S/ 2.50'
    },
    keyFeatures: ['Solo Lectura VE', 'Tasa Bs 235', 'Horarios VE', 'Pestañas de Estado']
  },
  {
    id: 'op-ve-2',
    title: 'Detalle de Operación #17 (Ficha Cliente & Beneficiario VE)',
    category: 'operador_venezuela',
    tag: 'Ficha Operación',
    badgeText: 'Datos de Acreditación',
    description: 'Ficha técnica completa de la transacción #17: datos del cliente en Perú (José Alfredo Silva Castillo | 960442025) y del beneficiario en Venezuela (Rodrigo Silva | C.I. 32456789 | Banco de Venezuela).',
    details: [
      'Cliente en Perú: José Alfredo Silva Castillo | Tel: 960442025 | Email: hydrosolarpro@gmail.com',
      'Beneficiario Venezuela: Rodrigo Silva | C.I. 32456789 | Tel: +51960442025',
      'Entidad Bancaria: Banco de Venezuela | N° Cuenta: 0012452316595 (Transferencia bancaria)',
      'Monto Depositado: S/ 50.00 vía Yape | Acreditar en Venezuela: Bs 11,750.00'
    ],
    mockData: {
      montoSoles: 50.00,
      montoBolivares: 11750.00,
      bancoDestino: 'Banco de Venezuela',
      metodoPago: 'Yape / Transferencia BDV'
    },
    keyFeatures: ['Copia Rápida C.I./Cuenta', 'Abono Banco de Venezuela', 'Validación Yape', 'Datos Cliente & Beneficiario']
  },
  {
    id: 'op-ve-3',
    title: 'Validación en 2 Pasos & Disparo Telegram / WhatsApp',
    category: 'operador_venezuela',
    tag: 'Validación VE',
    badgeText: 'Acreditar & Notificar',
    description: 'Confirmación cruzada de depósito recibido en Perú (07:02 a.m. Validó: Jose Silva) y abono realizado en Venezuela (08:08 a.m. VE Validó: Jose Silva) con tiempo de respuesta de 6 minutos.',
    details: [
      'Validación Perú: 29/7, 07:02 a. m. (Validó: Jose Silva)',
      'Validación Venezuela: 29/7, 08:08 a. m. (VE Validó: Jose Silva)',
      'Monto Acreditado: Bs 11,750.00 | Tiempo de respuesta registrado: 6 min',
      'Botonera directa: "Cargar comprobante de depósito en Venezuela" y "Notificar por WhatsApp al beneficiario"'
    ],
    mockData: {
      montoSoles: 50.00,
      montoBolivares: 11750.00,
      bancoDestino: 'Banco de Venezuela'
    },
    keyFeatures: ['Validación 2 Pasos', 'ChatBot Telegram Bot', 'WhatsApp 1-Clic', 'Registro de Tiempos']
  },
  {
    id: 'op-ve-4',
    title: 'Estadísticas de Operaciones VE & Gráficos (Julio 2026)',
    category: 'operador_venezuela',
    tag: 'Estadísticas VE',
    badgeText: 'Análisis de Período',
    description: 'Búsqueda avanzada por fecha específica, rango de fechas o mes completo. Resumen mensual de Julio 2026 con 17 operaciones por S/ 3,019.00 procesados.',
    details: [
      'Filtros temporales: Fecha específica, Rango de fechas, Mes (Julio 2026)',
      'Monto total procesado: S/ 3,019.00 en 17 Operaciones',
      'Gráfico de línea/barras: 07-26 (S/300), 07-27 (S/1200), 07-28 (S/1019), 07-29 (S/500)',
      'Opciones de exportación: "Descargar este gráfico", "Descargar los 3 (PDF)", "Descargar Excel"'
    ],
    mockData: {
      montoSoles: 3019.00,
      operacionesCount: 17,
      ganancia: 'S/ 150.95'
    },
    keyFeatures: ['Gráficos Interactivos', 'Filtro Mensual', 'Descarga PDF Tríptico', 'Exportación Excel']
  },
  {
    id: 'op-ve-5',
    title: 'Historial de Transacciones & Auditoría Multi-Operador',
    category: 'operador_venezuela',
    tag: 'Auditoría VE',
    badgeText: 'Sincronización PE/VE',
    description: 'Control diario de transacciones realizadas con buscador inteligente multicriterio y etiquetas de validación [PE] [VE] para auditoría transparente entre equipos.',
    details: [
      'Buscador por nombre, teléfono, fecha, monto o número de operación',
      'Badges de estado: [PE] (Depositado en Perú) y [VE] (Acreditado en Venezuela)',
      'Desglose por operador responsable en Perú y operador asignado en Venezuela'
    ],
    mockData: {
      operacionesCount: 17,
      montoSoles: 3019.00
    },
    keyFeatures: ['Badges PE/VE', 'Buscador Inteligente', 'Control Anti-Duplicados', 'Auditoría Transparente']
  }
];

export const CLIENT_SESSION_PREVIEWS: ScreenshotItem[] = [
  {
    id: 'op-cli-1',
    title: 'Pantalla de Inicio & Calculadora de Conversión',
    category: 'sesion_cliente',
    tag: 'Calculadora & Tasa',
    badgeText: 'Inicio Cliente',
    description: 'Bienvenida personalizada a José Alfredo Silva Castillo, horario de atención (9:00 - 21:00), tasa del día (Bs 235 por sol), equivalencia BCV en USD ($744.23 Bs) y EUR (€846.07 Bs), e ingreso del monto a enviar (ej. 100 Soles = Bs 23,500.00 ≈ $31.58 USD).',
    details: [
      'Bienvenida con nombre del cliente y eslogan de marca',
      'Tasa de cambio transparente en tiempo real (Bs 235 Soles → Bolívares)',
      'Referencia de moneda extranjera BCV USD ($744.23 Bs) y EUR (€846.07 Bs)',
      'Calculadora interactiva con equivalencias automáticas en dólares y euros'
    ],
    mockData: {
      tasa: 235,
      montoSoles: 100,
      montoBolivares: 23500
    },
    keyFeatures: ['Link Personalizado WhatsApp', 'Calculadora en Vivo', 'Equivalencia BCV Dólar/Euro', 'Sin Descargas Requeridas']
  },
  {
    id: 'op-cli-2',
    title: 'Selección & Registro de Beneficiario en Venezuela',
    category: 'sesion_cliente',
    tag: 'Beneficiario VE',
    badgeText: 'Abono en Venezuela',
    description: 'Formulario fácil e intuitivo con autocompletado rápido seleccionando beneficiarios frecuentes (ej. María Bello, Rodrigo Silva, Katherine Cordero) o ingresando Nombre, Teléfono, Cédula (C.I.), Banco, N° Cuenta o Pago Móvil, con switch para "Guardar estos datos para la próxima vez".',
    details: [
      'Botonera rápida de beneficiarios frecuentes guardados (María Bello, Rodrigo Silva, etc.)',
      'Modo Transferencia Bancaria o Pago Móvil en Venezuela',
      'Campos: Nombre completo, Teléfono, Cédula (C.I.), Entidad bancaria y N° de cuenta',
      'Opción de autoguardado inteligente para futuras solicitudes en 1 clic'
    ],
    mockData: {
      bancoDestino: 'Banco de Venezuela',
      metodoPago: 'Transferencia Bancaria / Pago Móvil'
    },
    keyFeatures: ['Beneficiarios Frecuentes', 'Transferencia / Pago Móvil', 'Autocompletado Rápido', 'Guardado Inteligente']
  },
  {
    id: 'op-cli-3',
    title: 'Datos para Pagar en Perú (Yape, Plin, BCP, BBVA)',
    category: 'sesion_cliente',
    tag: 'Métodos de Pago Perú',
    badgeText: 'Datos de Pago PE',
    description: 'Consulta de datos bancarios para depositar en Perú: Yape, Plin y Bin (960442025 - Jose Silva), BCP Titular JOSE ALFREDO SILVA CASTILLO (19498905205045 / CCI 00219419890520504590), BBVA Titular Leonardo Silva (1081542645245 / CCI 01081542645245215) con botones de "Copiar" con 1 solo clic.',
    details: [
      'Copia rápida de número de Yape, Plin y Bin: 960442025 (Jose Silva)',
      'Datos BCP: N° 19498905205045 / CCI 00219419890520504590 (Jose Alfredo Silva Castillo)',
      'Datos BBVA: N° 1081542645245 / CCI 01081542645245215 (Leonardo Silva)',
      'Selección interactiva de Forma de Pago: Yape / Plin / Transferencia bancaria'
    ],
    mockData: {
      metodoPago: 'Yape / Plin / BCP / BBVA'
    },
    keyFeatures: ['Botonera Copiar 1-Clic', 'Yape / Plin 960442025', 'Cuentas BCP & BBVA', 'Cero Errores de Transferencia']
  },
  {
    id: 'op-cli-4',
    title: 'Seguimiento de Solicitudes en Curso & Realizadas',
    category: 'sesion_cliente',
    tag: 'Estado de Envío',
    badgeText: 'Comprobante & Estado',
    description: 'Visualización de solicitudes realizadas hoy (ej. #15 Rodrigo Silva - S/ 50.00), desglose de tipo de pago Yape, cuenta de abono en Banco de Venezuela (Bs 11,750.00 ≈ $15.79 USD), checks verdes de validación en Perú y depósito en Venezuela, y acceso al comprobante descargable.',
    details: [
      'Pestañas: Solicitudes en curso (0) y Solicitudes realizadas hoy (1)',
      'Detalle completo: C.I. 32456789, Teléfono +51960442025, Banco de Venezuela N° 0012452316595',
      'Checks de verificación doble: Pago validado en Perú + Depósito en Venezuela',
      'Visualizador y descarga del comprobante oficial del depósito en Venezuela'
    ],
    mockData: {
      montoSoles: 50.00,
      montoBolivares: 11750.00,
      bancoDestino: 'Banco de Venezuela'
    },
    keyFeatures: ['Doble Check Verde PE/VE', 'Seguimiento en Tiempo Real', 'Comprobante PDF/Imagen', 'Historial Diario']
  },
  {
    id: 'op-cli-5',
    title: 'Gestión de Cuentas Guardadas & Vinculación a Telegram',
    category: 'sesion_cliente',
    tag: 'Cuentas Guardadas',
    badgeText: 'Notificaciones Telegram',
    description: 'Gestor de cuentas favoritas guardadas (María Bello, Rodrigo Silva, Katherine Cordero, María José Silva Ortiz) con opción de editar/eliminar y botón para vincular el Telegram del beneficiario (@Josesilva2023) para avisos automáticos.',
    details: [
      'Listado rápido de contactos y cuentas bancarias frecuentes',
      'Vinculación directa a Telegram para notificaciones automáticas al beneficiario (@Josesilva2023)',
      'Edición y eliminación de cuentas con un solo toque',
      'Sincronización instantánea con el formulario de nueva solicitud'
    ],
    mockData: {
      telegramUser: '@Josesilva2023'
    },
    keyFeatures: ['Gestor de Beneficiarios', 'Telegram Vincular 1-Clic', 'Edición Rápida', 'Avisos Automáticos']
  },
  {
    id: 'op-cli-6',
    title: 'Estadística & Historial de Depósitos del Cliente',
    category: 'sesion_cliente',
    tag: 'Estadísticas Cliente',
    badgeText: 'Gráficos de Envíos',
    description: 'Resumen mensual de depósitos realizados por el cliente (Mes Julio 2026: 15 depósitos por S/ 2,819.00 totales) con gráfico circular interactivo (donut) del monto solicitado por período (Barras, Circular, Línea).',
    details: [
      'Consulta por solicitudes de hoy, fecha específica, rango de fechas, mes o año',
      'Resumen de volumen total enviado (15 depósitos = S/ 2,819.00)',
      'Gráficos visuales interactivos: Barras, Circular (Donut) y Líneas',
      'Desglose detallado por fechas de envío para control personal del cliente'
    ],
    mockData: {
      montoSoles: 2819.00,
      operacionesCount: 15
    },
    keyFeatures: ['Gráfico Donut Interactivo', 'Resumen Total Enviado', 'Filtros de Mes / Fechas', 'Control de Gastos Personal']
  }
];
