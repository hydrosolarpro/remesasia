import { BASE_URL } from './invitaciones';

// Infografía de instalación (servida como archivo estático desde
// app/public/, igual que los términos legales en PDF -- ver
// app/public/legal/). URL absoluta porque los enlaces de WhatsApp/Telegram
// la necesitan así, sin importar la plataforma.
export const IMAGEN_INSTALAR_APP_URL = `${BASE_URL}/instalar-app.jpg`;

// Video de inicio rápido para la sesión del cliente en Perú (app/public/videos/).
export const VIDEO_INICIO_CLIENTE_URL = `${BASE_URL}/videos/inicio-rapido-cliente.mp4`;
export const VIDEO_INICIO_CLIENTE_MINIATURA_URL = `${BASE_URL}/videos/inicio-rapido-cliente.jpg`;

// Video para el Operador de Perú miembro (app/public/videos/).
export const VIDEO_OPERADOR_PERU_MIEMBRO_URL = `${BASE_URL}/videos/inicio-rapido-operador-peru-miembro.mp4`;
export const VIDEO_OPERADOR_PERU_MIEMBRO_MINIATURA_URL = `${BASE_URL}/videos/inicio-rapido-operador-peru-miembro.jpg`;
