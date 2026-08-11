import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ViewStyle, StyleProp, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Solicitud } from '../types/database';
import { construirEnlaceWhatsApp, construirEnlaceWhatsAppGenerico } from '../lib/whatsapp';
import { formatearBs } from '../lib/formato';
import { FORMATTER_FECHA_HORA, formatearTiempoRespuesta } from './OperationRow';
import { RoundCheck } from './RoundCheck';
import { ZoomableImageModal } from './ZoomableImageModal';
import { colors, radius, cardShadow } from '../constants/theme';

const ETIQUETA_METODO_PAGO: Record<Solicitud['metodo_pago'], string> = {
  yape: 'Yape',
  plin: 'Plin',
  banco: 'Transferencia bancaria',
};

const ETIQUETA_TIPO_TRANSFERENCIA: Record<Solicitud['tipo_transferencia'], string> = {
  transferencia_bancaria: 'Transferencia bancaria',
  pago_movil: 'Pago móvil',
};

// Fila de "Solicitudes en curso" / "Solicitudes realizadas" del cliente:
// resumen colapsado, expandible con los datos completos, las conversiones
// obtenidas al momento del envío, y — cuando el operador de Venezuela ya
// cargó el comprobante — la imagen con opción de descargar o reenviar por
// WhatsApp al beneficiario.
export function ClienteSolicitudRow({
  solicitud,
  numero,
  style,
  onConfirmar,
  onReportar,
  onConfirmarResuelto,
  confirmando,
  reportando,
  confirmandoResuelto,
  operadorNombre,
  operadorTelefono,
}: {
  solicitud: Solicitud;
  numero?: number;
  style?: StyleProp<ViewStyle>;
  /** Llamados solo cuando check_deposito_ve=true (ver checksRow de confirmación abajo). */
  onConfirmar?: () => void;
  onReportar?: () => void;
  /** El cliente ya verificó en cuenta y el depósito sí llegó -- disponible mientras en_revision=true. */
  onConfirmarResuelto?: () => void;
  confirmando?: boolean;
  reportando?: boolean;
  confirmandoResuelto?: boolean;
  /** Nombre del operador de Perú asignado a esta solicitud (miembro o principal). */
  operadorNombre?: string;
  /** Teléfono del operador de Perú asignado, para el botón de WhatsApp. */
  operadorTelefono?: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [zoom, setZoom] = useState(false);

  // "En curso" destaca cuándo se envió; "realizada" destaca cuándo se
  // efectuó el depósito en Venezuela (lo que el cliente quiere ver primero
  // una vez completada).
  const fechaPrincipal = solicitud.check_deposito_ve && solicitud.check_deposito_ve_at ? solicitud.check_deposito_ve_at : solicitud.created_at;

  const enlaceWhatsApp = solicitud.comprobante_vz_url
    ? construirEnlaceWhatsApp(
        solicitud.beneficiario_telefono,
        `Hola ${solicitud.beneficiario_nombre}, aquí está el comprobante de tu remesa de VES ${formatearBs(solicitud.monto_ves)}: ${solicitud.comprobante_vz_url}`
      )
    : null;

  const enviarWhatsApp = async () => {
    if (!enlaceWhatsApp) return;
    const puedeAbrir = await Linking.canOpenURL(enlaceWhatsApp);
    if (!puedeAbrir) {
      Alert.alert('No se pudo abrir WhatsApp', 'Verifica el número del beneficiario.');
      return;
    }
    Linking.openURL(enlaceWhatsApp);
  };

  const enlaceWhatsAppOperador = construirEnlaceWhatsAppGenerico(operadorTelefono, `Hola ${operadorNombre ?? ''}, te escribo por mi remesa.`);
  const contactarOperador = async () => {
    if (!enlaceWhatsAppOperador) return;
    const puedeAbrir = await Linking.canOpenURL(enlaceWhatsAppOperador);
    if (!puedeAbrir) {
      Alert.alert('No se pudo abrir WhatsApp', 'Verifica el número del operador.');
      return;
    }
    Linking.openURL(enlaceWhatsAppOperador);
  };

  return (
    <View style={[styles.card, cardShadow, style]}>
      <Pressable style={styles.header} onPress={() => setAbierto((v) => !v)}>
        <View style={styles.headerTextos}>
          <Text style={styles.fecha}>
            {numero ? `#${numero} · ` : ''}
            {FORMATTER_FECHA_HORA.format(new Date(fechaPrincipal))}
          </Text>
          <Text style={styles.beneficiario} numberOfLines={1}>
            {solicitud.beneficiario_nombre}
          </Text>
          <Text style={styles.monto}>PEN {solicitud.monto_pen.toFixed(2)}</Text>
        </View>
        <Text style={styles.chevron}>{abierto ? '▲' : '▼'}</Text>
      </Pressable>

      {abierto && (
        <View style={styles.detalle}>
          <Row label="Generada" value={FORMATTER_FECHA_HORA.format(new Date(solicitud.created_at))} />
          <Row label="Atendida" value={solicitud.check_deposito_ve_at ? FORMATTER_FECHA_HORA.format(new Date(solicitud.check_deposito_ve_at)) : '—'} />
          {solicitud.check_deposito_ve_at && (
            <Row label="Tiempo de respuesta total" value={formatearTiempoRespuesta(solicitud.created_at, solicitud.check_deposito_ve_at)} />
          )}
          {!!operadorNombre && (
            <View style={styles.operadorFila}>
              <Row label="Operador de Perú asignado" value={operadorNombre} />
              {enlaceWhatsAppOperador && (
                <Pressable onPress={contactarOperador}>
                  <Text style={styles.contactarOperadorTexto}>Contactar por WhatsApp</Text>
                </Pressable>
              )}
            </View>
          )}
          <Row label="C.I." value={solicitud.beneficiario_ci ?? '—'} />
          <Row label="Teléfono beneficiario" value={solicitud.beneficiario_telefono ?? '—'} />
          <Row label="Tipo de transferencia" value={ETIQUETA_TIPO_TRANSFERENCIA[solicitud.tipo_transferencia]} />
          <Row label="Entidad bancaria" value={solicitud.beneficiario_banco} />
          <Row label="N° cuenta" value={solicitud.beneficiario_cuenta} />
          <Row label="Forma de pago" value={ETIQUETA_METODO_PAGO[solicitud.metodo_pago]} />
          <Row label="Recibe" value={`VES ${formatearBs(solicitud.monto_ves)}`} />
          {solicitud.monto_usd_bcv != null && <Row label="≈ USD (BCV al enviar)" value={`$${solicitud.monto_usd_bcv.toFixed(2)}`} />}
          {solicitud.monto_eur_bcv != null && <Row label="≈ EUR (BCV al enviar)" value={`€${solicitud.monto_eur_bcv.toFixed(2)}`} />}

          <View style={styles.checksRow}>
            <EstadoPaso etiqueta="Pago validado en Perú" hecho={solicitud.check_deposito_peru} fecha={solicitud.check_deposito_peru_at} />
            <EstadoPaso etiqueta="Depósito en Venezuela" hecho={solicitud.check_deposito_ve} fecha={solicitud.check_deposito_ve_at} />
          </View>

          {solicitud.check_deposito_ve && (
            <View style={styles.confirmacionBloque}>
              {solicitud.en_revision ? (
                <View style={styles.enRevisionBloque}>
                  <Text style={styles.enRevisionTexto}>
                    🔎 En revisión por el equipo — te avisaremos por Telegram apenas se resuelva.
                  </Text>
                  <View style={styles.checkCol}>
                    <RoundCheck checked={false} loading={confirmandoResuelto} onPress={onConfirmarResuelto} size={26} />
                    <Text style={styles.checkLabel}>Ya verifiqué en cuenta, sí llegó — avisar a los operadores</Text>
                  </View>
                </View>
              ) : solicitud.check_beneficiario_confirmado ? (
                <View style={styles.checkCol}>
                  <RoundCheck checked disabled size={26} />
                  <Text style={styles.checkLabel}>Depósito validado en cuenta del Beneficiario</Text>
                </View>
              ) : (
                <View style={styles.checksRow}>
                  <View style={styles.checkCol}>
                    <RoundCheck checked={false} loading={confirmando} onPress={onConfirmar} size={26} />
                    <Text style={styles.checkLabel}>Depósito validado en cuenta del Beneficiario</Text>
                  </View>
                  <View style={styles.checkCol}>
                    <RoundCheck checked={false} loading={reportando} onPress={onReportar} size={26} />
                    <Text style={styles.checkLabel}>No llegó el depósito</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {solicitud.comprobante_vz_url && (
            <>
              <Pressable style={styles.imagenToggle} onPress={() => setZoom(true)}>
                <Text style={styles.imagenToggleTexto}>Comprobante del depósito en Venezuela · 🔍 toca para hacer zoom</Text>
              </Pressable>
              <Pressable onPress={() => setZoom(true)}>
                <Image source={{ uri: solicitud.comprobante_vz_url }} style={styles.comprobante} resizeMode="contain" />
              </Pressable>
              <View style={styles.accionesRow}>
                <Pressable style={styles.descargarBtn} onPress={() => Linking.openURL(solicitud.comprobante_vz_url!)}>
                  <Text style={styles.descargarBtnTexto}>Descargar</Text>
                </Pressable>
                {enlaceWhatsApp && (
                  <Pressable style={styles.whatsappBtn} onPress={enviarWhatsApp}>
                    <Text style={styles.whatsappBtnTexto}>Enviar por WhatsApp</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}

          <Pressable
            style={styles.verDetalleBtn}
            onPress={() => router.push({ pathname: '/(cliente)/solicitud/[id]', params: { id: solicitud.id } })}
          >
            <Text style={styles.verDetalleBtnTexto}>Ver seguimiento completo →</Text>
          </Pressable>
        </View>
      )}
      <ZoomableImageModal visible={zoom} uri={solicitud.comprobante_vz_url} onClose={() => setZoom(false)} />
    </View>
  );
}

function EstadoPaso({ etiqueta, hecho, fecha }: { etiqueta: string; hecho: boolean; fecha: string | null }) {
  return (
    <View style={styles.checkCol}>
      <View style={[styles.checkDot, hecho && styles.checkDotHecho]} />
      <Text style={styles.checkLabel}>{etiqueta}</Text>
      {fecha && <Text style={styles.checkHora}>{FORMATTER_FECHA_HORA.format(new Date(fecha))}</Text>}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  headerTextos: { flex: 1, marginRight: 8 },
  fecha: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  beneficiario: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  monto: { color: colors.accent, fontSize: 15, fontWeight: '700', marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 13 },
  detalle: { borderTopWidth: 1, borderTopColor: colors.border, padding: 14, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  operadorFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  contactarOperadorTexto: { color: colors.success, fontSize: 14, fontWeight: '700' },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  checksRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  checkCol: { alignItems: 'center', gap: 4, flex: 1 },
  checkDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border },
  checkDotHecho: { backgroundColor: colors.success, borderColor: colors.success },
  checkLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  checkHora: { color: colors.textMuted, fontSize: 10 },
  confirmacionBloque: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  enRevisionBloque: { gap: 10, alignItems: 'center' },
  enRevisionTexto: { color: colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  imagenToggle: { backgroundColor: colors.cardAlt, borderRadius: radius.sm, padding: 10, marginTop: 4 },
  imagenToggleTexto: { color: colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  comprobante: { width: '100%', height: 180, borderRadius: radius.sm, backgroundColor: colors.cardAlt, marginTop: 4 },
  accionesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  descargarBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  descargarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  whatsappBtn: { flex: 1, backgroundColor: colors.success, borderRadius: radius.sm, padding: 10, alignItems: 'center' },
  whatsappBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  verDetalleBtn: { marginTop: 10, alignItems: 'center' },
  verDetalleBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 14 },
});
