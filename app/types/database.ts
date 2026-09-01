export type Rol = 'cliente' | 'operador_peru' | 'operador_peru_miembro' | 'operador_venezuela' | 'administrador';

export type EstadoSolicitud =
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'EN_VERIFICACION'
  | 'FONDOS_VERIFICADOS'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'RECHAZADA'
  | 'CANCELADA';

export type MetodoPago = 'yape' | 'plin' | 'banco';
export type TipoTransferencia = 'transferencia_bancaria' | 'pago_movil';
export type PlanOperador = 'demo' | 'starter' | 'pro' | 'expert' | 'avance' | 'ultra' | 'unlimited' | 'medida';

export interface Usuario {
  id: string;
  telefono: string | null;
  nombre: string;
  email: string | null;
  pais: string | null;
  rol: Rol;
  push_token: string | null;
  negocio_operador_peru_id: string | null;
  acceso_concedido: boolean;
  /** Solo relevante para rol 'operador_peru': plan DEMO o un plan pagado. */
  plan: PlanOperador;
  demo_inicio: string | null;
  /** Momento exacto en que se activó el plan pagado vigente -- ancla su ciclo de 30 días (ver lib/plan.ts). */
  plan_inicio: string | null;
  /** Solo plan 'unlimited': cupo de clientes acordado con el administrador (sin esto, sin límite -- ver lib/plan.ts). */
  limite_clientes_unlimited: number | null;
  created_at: string;
  /** Notificaciones automáticas por Telegram (rol 'cliente'): ver perfil del cliente. */
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_connected: boolean;
  /** Para clientes: qué miembro de Perú (operador_peru_miembro) los invitó. */
  invitado_por_operador_miembro_id: string | null;
  /** Preferencia del cliente para recibir avisos de depósito validado (elegida en su Perfil). */
  canal_notificacion: CanalNotificacion;
  /** Cuándo vio la guía paso a paso de su sesión (null = todavía no, se le muestra sola). */
  guia_vista_at: string | null;
  /** Documento de identidad (rol 'cliente'): obligatorio antes de su primera solicitud -- ver Perfil. */
  documento_tipo: DocumentoTipo | null;
  documento_numero: string | null;
  documento_imagen_url: string | null;
  /** Datos opcionales de quién recomendó al cliente (de palabra, no el sistema de invitaciones). */
  referido_nombre: string | null;
  referido_apellido: string | null;
  referido_telefono: string | null;
}

export type CanalNotificacion = 'telegram' | 'whatsapp' | 'ambos';

export type DocumentoTipo = 'DNI' | 'CE' | 'PASAPORTE' | 'CPP' | 'PPT' | 'CI';

export interface Tasa {
  id: string;
  fecha: string; // YYYY-MM-DD
  tasa_pen_ves: number;
  /** Tasa de adquisición (Ta) del día -- usada junto a tasa_pen_ves (Tv) para calcular Ganancia Bruta/Neta. */
  tasa_adquisicion: number | null;
  publicada_por: string;
  /** Si no es null, esta fila es la tasa PROPIA de ese Operador de Perú miembro (no la del principal). */
  operador_peru_miembro_id: string | null;
  created_at: string;
}

export interface BeneficiarioVES {
  nombre: string;
  banco: string;
  cuenta_o_telefono: string;
}

export interface Solicitud {
  id: string;
  /** Null en una operación cuyo cliente fue eliminado junto a todo su negocio (ver eliminar_operador_peru) -- el historial se conserva con los campos *_historico de abajo. */
  cliente_id: string | null;
  operador_peru_id: string | null;
  operador_venezuela_id: string | null;
  estado: EstadoSolicitud;
  monto_pen: number;
  tasa_pen_ves: number;
  monto_ves: number;
  monto_usd_bcv: number | null;
  monto_eur_bcv: number | null;
  beneficiario_nombre: string;
  beneficiario_banco: string;
  beneficiario_cuenta: string;
  beneficiario_ci: string | null;
  beneficiario_telefono: string | null;
  tipo_transferencia: TipoTransferencia;
  metodo_pago: MetodoPago;
  /** Imágenes del comprobante de depósito del cliente (una o varias). */
  comprobante_pago_urls: string[];
  motivo_rechazo: string | null;
  tasa_real_compra: number | null;
  /** Imágenes del comprobante de depósito en Venezuela, subidas por el operador VE (una o varias). */
  comprobante_vz_urls: string[];
  comprobante_pdf_url: string | null;
  check_deposito_peru: boolean;
  check_deposito_peru_at: string | null;
  check_deposito_ve: boolean;
  check_deposito_ve_at: string | null;
  validado_peru_por: string | null;
  validado_ve_por: string | null;
  /** Null en una operación de un negocio ya eliminado (ver eliminar_operador_peru). */
  negocio_operador_peru_id: string | null;
  created_at: string;
  updated_at: string;
  /** Nombre/teléfono/correo del cliente "congelados" al eliminar su cuenta -- solo se llenan en ese momento (ver eliminar_operador_peru). */
  cliente_nombre_historico: string | null;
  cliente_telefono_historico: string | null;
  cliente_email_historico: string | null;
  /** El cliente confirma que el dinero llegó a la cuenta del beneficiario. */
  check_beneficiario_confirmado: boolean;
  check_beneficiario_confirmado_at: string | null;
  /** true mientras la solicitud está escalada en "Operaciones por revisar". */
  en_revision: boolean;
  en_revision_at: string | null;
  revision_resuelta_at: string | null;
  revision_resuelta_por: string | null;
  /** Qué operador de Perú miembro atiende esta operación (null = la atiende el Operador principal). */
  operador_peru_miembro_id: string | null;
  /** true cuando el Operador principal derivó esta operación a un miembro de Perú. */
  derivada_de_principal: boolean;
  /** % de comisión (C1/C2) congelado al momento de check_deposito_ve = true; null en operaciones anteriores a este campo o aún no realizadas. */
  comision_peru_pct_aplicada: number | null;
  comision_venezuela_pct_aplicada: number | null;
}

export interface PerfilNegocio {
  id: string;
  operador_peru_id: string;
  nombre_negocio: string;
  logo_url: string | null;
  eslogan: string;
  rentabilidad_pct: number;
  yape_qr_url: string | null;
  plin_qr_url: string | null;
  yape_telefono: string | null;
  plin_telefono: string | null;
  otro_medio_nombre: string | null;
  otro_medio_telefono: string | null;
  es_operador_venezuela_mismo: boolean;
  horario_inicio: string;
  horario_fin: string;
  compartir_rentabilidad_ve: boolean;
  compartir_rentabilidad_pe_miembros: boolean;
  /** Automarketing: WhatsApp que se muestra en las publicaciones generadas (ver 0092). */
  whatsapp_marketing: string | null;
  /** Automarketing: estilo visual por defecto para las publicaciones (ver 0092). */
  estilo_marketing_preferido: string | null;
  created_at: string;
  updated_at: string;
}

// Automarketing (0092): publicación para redes sociales generada con IA.
export interface PublicacionMarketing {
  id: string;
  operador_peru_id: string;
  red_social: 'facebook' | 'instagram' | 'tiktok';
  concepto: string;
  estilo: string;
  paleta: string;
  enfoque: string;
  imagen_prompt: string;
  imagen_url: string;
  texto: string;
  wa_link: string | null;
  invitacion_link: string | null;
  ancho: number;
  alto: number;
  created_at: string;
}

export interface CuentaBancariaOperador {
  id: string;
  operador_peru_id: string;
  entidad: string;
  titular: string;
  numero_cuenta: string;
  cci: string;
  created_at: string;
}

export interface OperadorVenezuelaPerfil {
  id: string;
  operador_peru_id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  usuario_id: string | null;
  /** % de comisión individual asignado por el principal (C2 en las fórmulas de ganancia). */
  comision_pct: number;
  created_at: string;
  updated_at: string;
}

export interface OperadorPeruMiembro {
  id: string;
  operador_peru_id: string;
  nombre: string;
  telefono: string | null;
  email: string;
  usuario_id: string | null;
  /** Operador de Venezuela al que el principal asignó este miembro de Perú. */
  operador_venezuela_id: string | null;
  /** % de comisión individual asignado por el principal (C1 en las fórmulas de ganancia). */
  comision_pct: number;
  /** El principal le dio permiso a este miembro de publicar su propia Tasa del día (Tv), aplicada solo a sus clientes. */
  puede_editar_tasa: boolean;
  created_at: string;
  updated_at: string;
}

export interface CuentaUtilizadaCliente {
  id: string;
  cliente_id: string;
  nombre_beneficiario: string;
  telefono: string | null;
  ci: string;
  entidad_bancaria: string;
  numero_cuenta: string;
  created_at: string;
  /** Notificaciones automáticas por Telegram al beneficiario (sin cuenta en la app). */
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_connected: boolean;
  telegram_connected_at: string | null;
}

/** Persona (Fase C) -- puede tener varias cuentas bancarias, ver BeneficiarioCuentaBancaria. Telegram se vincula por persona, no por cuenta. */
export interface BeneficiarioCliente {
  id: string;
  cliente_id: string;
  nombre: string;
  ci: string;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_connected: boolean;
  telegram_connected_at: string | null;
  created_at: string;
}

export interface BeneficiarioCuentaBancaria {
  id: string;
  beneficiario_id: string;
  entidad_bancaria: string;
  numero_cuenta: string;
  telefono: string | null;
  created_at: string;
}

export interface TasaBcv {
  id: string;
  fecha: string;
  usd_ves: number;
  eur_ves: number;
  fetched_at: string;
}

export interface MensajeChat {
  id: string;
  solicitud_id: string;
  autor_id: string;
  autor_rol: Rol;
  mensaje: string;
  created_at: string;
}

export type TipoInvitacion = 'operador_peru' | 'cliente';

export interface Invitacion {
  id: string;
  token: string;
  tipo: TipoInvitacion;
  negocio_operador_peru_id: string | null;
  creado_por: string;
  usado_por: string | null;
  used_at: string | null;
  created_at: string;
  /** Si la invitación de cliente salió de un miembro de Perú, queda registrado aquí. */
  operador_peru_miembro_id: string | null;
}

export type EstadoPago = 'pendiente' | 'verificado' | 'rechazado';

export interface PagoSuscripcion {
  id: string;
  /** Null si el operador fue eliminado (ver eliminar_operador_peru) -- el pago se conserva como registro contable. */
  operador_peru_id: string | null;
  periodo: string; // 'YYYY-MM'
  monto: number;
  /** UNLIMITED consultado, sin tarifa fijada todavía por el admin. */
  monto_por_definir: boolean;
  /** Plan a la medida: monto = N × S/ 1 / mes; N se guarda en limite_clientes. */
  plan_a_medida: boolean;
  /** Cupo de clientes pactado (UNLIMITED y plan a la medida). */
  limite_clientes: number | null;
  comprobante_url: string | null;
  estado: EstadoPago;
  motivo_rechazo: string | null;
  verificado_por: string | null;
  verificado_at: string | null;
  created_at: string;
}

/** Renovación o cambio de plan pagado por adelantado, mientras el ciclo de 30 días vigente todavía no termina -- ver admin_validar_cambio_plan / activar_planes_encolados en supabase. */
export interface CambioPlanPendiente {
  id: string;
  operador_peru_id: string;
  plan_solicitado: PlanOperador;
  monto: number;
  /** UNLIMITED consultado, sin tarifa fijada todavía por el admin. */
  monto_por_definir: boolean;
  /** Plan a la medida: monto = N × S/ 1 / mes; N se guarda en limite_clientes. */
  plan_a_medida: boolean;
  /** Cupo de clientes pactado (UNLIMITED y plan a la medida). */
  limite_clientes: number | null;
  comprobante_url: string | null;
  estado: EstadoPago;
  motivo_rechazo: string | null;
  verificado_por: string | null;
  verificado_at: string | null;
  /** Se llena cuando el cron activa el cambio al terminar el ciclo actual. */
  activado_at: string | null;
  created_at: string;
}

export type PaisProspecto = 'peru' | 'venezuela' | 'ambos';
export type OperaActualmente = 'ya_opero' | 'quiero_empezar' | 'solo_investigando';
export type VolumenMensualProspecto = 'menos_20' | '20_100' | '100_300' | 'mas_300';
export type TieneEquipoProspecto = 'con_equipo' | 'solo' | 'sin_equipo';
export type UrgenciaProspecto = 'esta_semana' | 'este_mes' | 'explorando';
export type EstadoLead = 'nuevo' | 'contactado' | 'demo_enviado' | 'convertido' | 'descartado';

/** Lead captado por el cuestionario filtro de la landing de ventas del SaaS (remesas-perú-venezuela/). Ver CRM en (admin)/crm-prospectos.tsx. */
export interface Prospecto {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  pais: PaisProspecto;
  opera_actualmente: OperaActualmente;
  volumen_mensual: VolumenMensualProspecto;
  tiene_equipo: TieneEquipoProspecto;
  urgencia: UrgenciaProspecto;
  puntaje: number;
  calificado: boolean;
  estado: EstadoLead;
  notas: string | null;
  contactado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracionPagosAdmin {
  id: string;
  banco: string | null;
  cuenta_soles: string | null;
  cci: string | null;
  titular: string | null;
  yape_qr_url: string | null;
  plin_qr_url: string | null;
  yape_telefono: string | null;
  plin_telefono: string | null;
  otro_medio_nombre: string | null;
  otro_medio_telefono: string | null;
  monto_suscripcion: number;
  updated_at: string;
}
