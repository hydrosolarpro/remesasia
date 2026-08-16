import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Reglas de paginación (page-break-inside/after) para que expo-print (motor
// de impresión tipo Chromium) nunca corte una imagen, una tarjeta del
// resumen o una fila de tabla justo en el borde de una página -- si el
// bloque no entra completo, lo empuja entero a la página siguiente en vez
// de partirlo. Las imágenes de gráficos además llevan max-height + width/
// height:auto (equivalente a "contain"): si un gráfico circular con mucha
// leyenda queda muy alto, se escala completo dentro de una sola página en
// vez de desbordarla.
const ESTILOS_BASE = `
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0A0E1B; padding: 32px 40px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .subtitulo { color: #666; font-size: 12px; margin: 0 0 24px; }
    h2 { font-size: 14px; margin: 0 0 4px; page-break-after: avoid; break-after: avoid; }
    .grafico-bloque { margin-top: 24px; page-break-inside: avoid; break-inside: avoid; }
    img { max-width: 100%; max-height: 620px; width: auto; height: auto; display: block; margin: 8px auto 0; border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th, td { text-align: left; padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #e5e5e5; }
    th { background: #f4f4f7; font-weight: 700; color: #333; }
    .resumen { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 16px; }
    .resumen-item { border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px 18px; max-width: 100%; page-break-inside: avoid; break-inside: avoid; }
    .resumen-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
    .resumen-valor { font-size: 18px; font-weight: 800; margin-top: 2px; }
    .pie { margin-top: 32px; font-size: 10px; color: #999; text-align: center; }
  </style>
`;

/**
 * Genera un PDF a partir de HTML (encabezado + estilos ya incluidos) y abre
 * el diálogo de compartir/guardar del sistema.
 */
export async function generarYCompartirPdf(titulo: string, subtitulo: string, cuerpoHtml: string) {
  const html = `
    <html>
      <head>${ESTILOS_BASE}</head>
      <body>
        <h1>${titulo}</h1>
        <p class="subtitulo">${subtitulo}</p>
        ${cuerpoHtml}
        <p class="pie">Generado automáticamente por App Remesas IA — Remesas PERU-VENEZUELA</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }
  return uri;
}
