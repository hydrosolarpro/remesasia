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
export type PlanOperador = 'demo' | 'starter' | 'pro' | 'expert' | 'avance' | 'ultra';

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
  /** Solo relevante para rol 'operador_peru': plan DEMO (15 días) o STARTER (pagado). */
  plan: PlanOperador;
  demo_inicio: string | null;
  created_at: string;
  /** Notificaciones automáticas por Telegram (rol 'cliente'): ver perfil del cliente. */
  telegram_chat_id: string | null;
  telegram_username: string | null;
  telegram_connected: boolean;
}

export interface Tasa {
  id: string;
  fecha: string; // YYYY-MM-DD
  tasa_pen_ves: number;
  publicada_por: string;
  created_at: string;
}

export interface BeneficiarioVES {
  nombre: string;
  banco: string;
  cuenta_o_telefono: string;
}

export interface Solicitud {
  id: string;
  cliente_id: string;
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
  comprobante_pago_url: string | null;
  motivo_rechazo: string | null;
  tasa_real_compra: number | null;
  comprobante_vz_url: string | null;
  comprobante_pdf_url: string | null;
  check_deposito_peru: boolean;
  check_deposito_peru_at: string | null;
  check_deposito_ve: boolean;
  check_deposito_ve_at: string | null;
  validado_peru_por: string | null;
  validado_ve_por: string | null;
  negocio_operador_peru_id: string;
  created_at: string;
  updated_at: string;
  /** El cliente confirma que el dinero llegó a la cuenta del beneficiario. */
  check_beneficiario_confirmado: boolean;
  check_beneficiario_confirmado_at: string | null;
  /** true mientras la solicitud está escalada en "Operaciones por revisar". */
  en_revision: boolean;
  en_revision_at: string | null;
  revision_resuelta_at: string | null;
  revision_resuelta_por: string | null;
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
  created_at: string;
  updated_at: string;
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
}

export type EstadoPago = 'pendiente' | 'verificado' | 'rechazado';

export interface PagoSuscripcion {
  id: string;
  operador_peru_id: string;
  periodo: string; // 'YYYY-MM'
  monto: number;
  comprobante_url: string | null;
  estado: EstadoPago;
  motivo_rechazo: string | null;
  verificado_por: string | null;
  verificado_at: string | null;
  created_at: string;
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
