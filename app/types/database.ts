export type Rol = 'cliente' | 'operador_peru' | 'operador_venezuela';

export type EstadoSolicitud =
  | 'BORRADOR'
  | 'PENDIENTE'
  | 'EN_VERIFICACION'
  | 'FONDOS_VERIFICADOS'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'RECHAZADA'
  | 'CANCELADA';

export type MetodoPago = 'yape' | 'banco';

export interface Usuario {
  id: string;
  telefono: string;
  nombre: string;
  rol: Rol;
  push_token: string | null;
  created_at: string;
}

export interface Tasa {
  id: string;
  fecha: string; // YYYY-MM-DD
  tasa_pen_usdt: number;
  tasa_usdt_ves: number;
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
  tasa_pen_usdt: number;
  tasa_usdt_ves: number;
  monto_usdt: number;
  monto_ves: number;
  beneficiario_nombre: string;
  beneficiario_banco: string;
  beneficiario_cuenta: string;
  metodo_pago: MetodoPago;
  comprobante_pago_url: string | null;
  motivo_rechazo: string | null;
  tasa_real_compra: number | null;
  comprobante_vz_url: string | null;
  comprobante_pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MensajeChat {
  id: string;
  solicitud_id: string;
  autor_id: string;
  autor_rol: Rol;
  mensaje: string;
  created_at: string;
}

export interface OperacionesDashboardRow {
  fecha: string;
  n_ops: number;
  vol_pen: number;
  vol_usdt: number;
  ganancia_neta: number;
}
