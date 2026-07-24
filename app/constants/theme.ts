import { Platform } from 'react-native';

// Paleta "fintech oscuro" — profesional con acentos vívidos (indigo/violeta + teal).
// Mismas claves que antes (bg, card, border, primary, accent, text, textMuted,
// warning, danger, success) para que ningún screen existente necesite tocarse:
// solo cambian los valores.
export const colors = {
  bg: '#0A0E1B',
  card: '#141A2E',
  cardAlt: '#1B2338',
  border: '#262F49',
  primary: '#6C5CE7',
  primaryPressed: '#5A48D6',
  accent: '#22D3C4',
  text: '#F5F7FF',
  textMuted: '#8891AC',
  warning: '#FBBF24',
  danger: '#FB4E70',
  success: '#34D399',
  gradientStart: '#6C5CE7',
  gradientEnd: '#22D3C4',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

// Sombra de tarjeta consistente entre nativo (shadow* + elevation) y web (boxShadow).
export const cardShadow = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(4, 8, 20, 0.35)' } as const,
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

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

// Anchos máximos del "shell" en pantallas grandes (web/tablet) — en móvil el
// viewport siempre es menor a todos estos valores, así que no cambia nada ahí.
// El root usa WIDE (lo más ancho que necesita cualquier sección); auth y
// cliente lo angostan más porque son flujos de una sola columna tipo móvil.
export const APP_MAX_WIDTH_NARROW = 480; // login / registro
export const APP_MAX_WIDTH_MEDIUM = 640; // cliente: calculadora, formularios
export const APP_MAX_WIDTH_WIDE = 1080; // operador Perú/Venezuela: dashboard, listas, gráficas

export const roleColors: Record<string, string> = {
  cliente: colors.accent,
  operador_peru: colors.primary,
  operador_venezuela: colors.warning,
  administrador: colors.danger,
};

// Sin emoji de bandera en el texto: no se renderizan en Windows/Chrome.
// RoleTag agrega el ícono de bandera (SVG) por separado cuando aplica.
export const roleLabel: Record<string, string> = {
  cliente: 'Cliente',
  operador_peru: 'Operador Perú',
  operador_venezuela: 'Operador Venezuela',
  administrador: 'Administrador',
};
