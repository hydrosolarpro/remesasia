import PDFDocument from 'npm:pdfkit@0.15.0';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

/**
 * F9 — Comprobante PDF automático, generado al marcar una solicitud COMPLETADA.
 * Disparada por el trigger `trg_notificar_y_generar_comprobante` (ver
 * supabase/migrations/0005_webhooks.sql). Sube el PDF al bucket `comprobantes`
 * y guarda la URL pública en `solicitudes.comprobante_pdf_url`.
 */
Deno.serve(async (req) => {
  try {
    const { solicitud_id } = await req.json();
    if (!solicitud_id) {
      return new Response(JSON.stringify({ error: 'Falta solicitud_id' }), { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data: solicitud, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('id', solicitud_id)
      .single();

    if (error || !solicitud) {
      return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), { status: 404 });
    }

    const pdfBytes = await renderizarComprobante(solicitud);
    const path = `${solicitud_id}/comprobante.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
    }

    const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

    await supabase
      .from('solicitudes')
      .update({ comprobante_pdf_url: publicUrl.publicUrl })
      .eq('id', solicitud_id);

    return new Response(JSON.stringify({ comprobante_pdf_url: publicUrl.publicUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// deno-lint-ignore no-explicit-any
function renderizarComprobante(solicitud: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const salida = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        salida.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(salida);
    });
    doc.on('error', reject);

    doc.fontSize(18).text('App Remesas IA', { align: 'center' });
    doc.fontSize(11).fillColor('#666').text('Comprobante de transferencia PEN → VES', { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#000').fontSize(10);
    fila(doc, 'N° de solicitud', solicitud.id);
    fila(doc, 'Fecha', new Date(solicitud.created_at).toLocaleString('es-PE'));
    fila(doc, 'Beneficiario', solicitud.beneficiario_nombre);
    fila(doc, 'Banco', solicitud.beneficiario_banco);
    fila(doc, 'Cuenta / teléfono', solicitud.beneficiario_cuenta);
    doc.moveDown(0.5);
    fila(doc, 'Monto enviado', `S/ ${Number(solicitud.monto_pen).toFixed(2)}`);
    fila(doc, 'Tasa PEN/USDT', `S/ ${solicitud.tasa_pen_usdt}`);
    fila(doc, 'USDT movilizados', Number(solicitud.monto_usdt).toFixed(2));
    fila(doc, 'Tasa USDT/VES', `Bs ${solicitud.tasa_usdt_ves}`);
    doc.moveDown(0.5);
    doc.fontSize(13).text(`Monto recibido: Bs ${Number(solicitud.monto_ves).toFixed(2)}`, { align: 'left' });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('Generado automáticamente por App Remesas IA', { align: 'center' });

    doc.end();
  });
}

// deno-lint-ignore no-explicit-any
function fila(doc: any, label: string, valor: string) {
  doc.fillColor('#666').text(label, { continued: true }).fillColor('#000').text(`   ${valor}`);
}
