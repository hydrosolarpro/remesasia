export const colors = {
  bg: '#0B1220',
  card: '#121B2E',
  border: '#22304A',
  primary: '#0F62FE',
  accent: '#22C3A6',
  text: '#F4F7FB',
  textMuted: '#8FA3C0',
  warning: '#F5A623',
  danger: '#E5484D',
  success: '#22C3A6',
};

export const estadoColor: Record<string, string> = {
  BORRADOR: colors.textMuted,
  PENDIENTE: colors.warning,
  EN_VERIFICACION: colors.primary,
  FONDOS_VERIFICADOS: colors.accent,
  EN_PROCESO: colors.primary,
  COMPLETADA: colors.success,
  RECHAZADA: colors.danger,
  CANCELADA: colors.textMuted,
};

export const estadoLabel: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  EN_VERIFICACION: 'En verificación',
  FONDOS_VERIFICADOS: 'Fondos verificados',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};
