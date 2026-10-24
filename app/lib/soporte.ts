import { NUMERO_ADMIN_WHATSAPP } from './whatsapp';
import { Rol } from '../types/database';

// Contacto de soporte técnico 24/7 y de privacidad (derechos ARCO).
export const CONTACTO_SOPORTE = {
  email: 'productosaas2026@gmail.com',
  telefonoVisible: '+51 960 442 025',
};

const ETIQUETA_ROL: Record<Rol, string> = {
  cliente: 'Cliente',
  operador_peru: 'Operador Perú (principal)',
  operador_peru_miembro: 'Operador Perú (miembro)',
  operador_venezuela: 'Operador Venezuela',
  administrador: 'Administrador',
};

// Enlace de WhatsApp al soporte con el mensaje URGENTE ya escrito y los datos
// de quien lo pulsa. No envía nada solo: el usuario revisa y toca "enviar".
export function enlaceWhatsAppSoporteUrgente(usuario: {
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  rol: Rol;
}): string {
  const mensaje = [
    'URGENTE - Soporte técnico Remesas IA',
    `Nombre: ${usuario.nombre ?? 'sin nombre'}`,
    `Teléfono: ${usuario.telefono ?? 'sin teléfono'}`,
    `Correo: ${usuario.email ?? 'sin correo'}`,
    `Rol: ${ETIQUETA_ROL[usuario.rol] ?? usuario.rol}`,
    'Describe aquí tu problema:',
  ].join('\n');
  return `https://wa.me/${NUMERO_ADMIN_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
