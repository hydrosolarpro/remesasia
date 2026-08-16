import { BASE_URL } from './invitaciones';

// Infografía de instalación (servida como archivo estático desde
// app/public/, igual que los términos legales en PDF -- ver
// app/public/legal/). URL absoluta porque los enlaces de WhatsApp/Telegram
// la necesitan así, sin importar la plataforma.
export const IMAGEN_INSTALAR_APP_URL = `${BASE_URL}/instalar-app.jpg`;
