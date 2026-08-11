import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ViewStyle, StyleProp, Linking, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Solicitud, CanalNotificacion } from '../types/database';
import { RoundCheck } from './RoundCheck';
import { CopyField } from './CopyField';
import {
  construirEnlaceWhatsApp,
  construirEnlaceWhatsAppGenerico,
  mensajeConfirmacionDeposito,
  mensajeAvisoClientePeruValidado,
  mensajeAvisoClienteVeValidado,
} from '../lib/whatsapp';
import { formatearBs } from '../lib/formato';
import { extensionDeImagen, validarTamanoImagen, MAX_IMAGEN_KB } from '../lib/imagenUtil';
import { ZoomableImageModal } from './ZoomableImageModal';
import { calcularGananciaOperacion } from '../lib/tasaCalculo';
import { colors, radius, cardShadow } from '../constants/theme';

export const FORMATTER_FECHA_HORA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const FORMATTER_HORA_VE = new Intl.DateTimeFormat('es-VE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Caracas',
});

export interface OperationRowData extends Solicitud {
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  /** Preferencia de canal del cliente (Perfil): a qué botones de WhatsApp mostrarle. */
  cliente_canal_notificacion: CanalNotificacion;
  validador_peru_nombre: string | null;
  validador_ve_nombre: string | null;
  /** Nombre del operador de Perú miembro que atiende la operación (null = el Operador principal). */
  operador_peru_atiende?: string | null;
  /** Teléfono del operador de Perú miembro que atiende (null = el Operador principal). */
  operador_peru_atiende_telefono?: string | null;
  /** Ganancia/comisión de esta operación (null si falta la tasa de adquisición del día en que se hizo). */
  ganancia?: ReturnType<typeof calcularGananciaOperacion>;
}

const ETIQUETA_METODO_PAGO: Record<OperationRowData['metodo_pago'], string> = {
  yape: 'Yape',
  plin: 'Plin',
  banco: 'Transferencia bancaria',
};

const ETIQUETA_TIPO_TRANSFERENCIA: Record<OperationRowData['tipo_transferencia'], string> = {
  transferencia_bancaria: 'Transferencia bancaria',
  pago_movil: 'Pago móvil',
};

// Diferencia entre dos timestamps ISO (p.ej. Generada→Atendida, o el tramo
// interno PE→VE). Si cae en el mismo día solo se muestra horas/minutos; si
// cruza de día se agrega la cantidad de días de diferencia.
export function formatearTiempoRespuesta(desde: string, hasta: string): string {
  const a = new Date(desde).getTime();
  const b = new Date(hasta).getTime();
  const diffMs = Math.abs(b - a);
  const mismoDia = desde.slice(0, 10) === hasta.slice(0, 10);
  const totalMin = Math.round(diffMs / 60000);

  if (mismoDia) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  }

  const dias = Math.floor(diffMs / 86400000);
  const remMin = totalMin - dias * 24 * 60;
  const h = Math.floor(remMin / 60);
  const m = remMin % 60;
  return `${dias} d ${h} h ${m} min`;
}

// Fila de "Operaciones en curso" / "Operaciones realizadas": resumen
// colapsado con nombre/monto, expandible para ver los datos completos y
// las imágenes de depósito, con los dos checks verdes de validación.
export function OperationRow({
  op,
  numero,
  nombreNegocio,
  puedeValidarPeru,
  puedeValidarVe,
  onValidarPeru,
  onValidarVe,
  validandoPeru,
  validandoVe,
  onResolverRevision,
  resolviendoRevision,
  onRecargarComprobanteVe,
  recargandoComprobanteVe,
  atendidoPor,
  atendidoPorTelefono,
  derivadaDePrincipal,
  onDerivar,
  style,
}: {
  op: OperationRowData;
  /** Numeración estable (p.ej. en "Operaciones realizadas"), independiente del orden/filtro visible. */
  numero?: number;
  /** Nombre del negocio, para el mensaje de WhatsApp (mismo texto que el envío automático al validar). */
  nombreNegocio: string;
  puedeValidarPeru: boolean;
  puedeValidarVe: boolean;
  onValidarPeru: () => void;
  /** El check VE exige subir la foto del depósito hecho en Venezuela primero. */
  onValidarVe: (comprobanteUri: string, comprobanteExt: string) => void;
  validandoPeru: boolean;
  validandoVe: boolean;
  /** Solo relevante cuando op.en_revision=true (lista "Operaciones por revisar"). */
  onResolverRevision?: () => void;
  resolviendoRevision?: boolean;
  /** Vuelve a subir el comprobante VE mientras la operación está en revisión (Perú principal, Perú miembro o Venezuela). */
  onRecargarComprobanteVe?: (comprobanteUri: string, comprobanteExt: string) => void;
  recargandoComprobanteVe?: boolean;
  /** Nombre del operador de Perú que atiende esta operación (p.ej. "Operador principal de Perú"). */
  atendidoPor?: string;
  /** Teléfono del operador de Perú que atiende, para el botón de WhatsApp. */
  atendidoPorTelefono?: string | null;
  /** Marca visual: operación derivada del Operador principal a un miembro de Perú. */
  derivadaDePrincipal?: boolean;
  /** Botón "Derivar" (solo lo usa el Operador principal sobre sus propias operaciones). */
  onDerivar?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [abierto, setAbierto] = useState(false);

  const tocarCheckVe = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos para subir el comprobante del depósito en Venezuela.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (resultado.canceled) return;
    if (!(await validarTamanoImagen(resultado.assets[0]))) {
      Alert.alert('Imagen muy pesada', `La imagen supera el límite de ${MAX_IMAGEN_KB} KB. Elige una más liviana.`);
      return;
    }
    onValidarVe(resultado.assets[0].uri, extensionDeImagen(resultado.assets[0]));
  };

  const tocarRecargarComprobante = async () => {
    if (!onRecargarComprobanteVe) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos para subir el comprobante corregido.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (resultado.canceled) return;
    if (!(await validarTamanoImagen(resultado.assets[0]))) {
      Alert.alert('Imagen muy pesada', `La imagen supera el límite de ${MAX_IMAGEN_KB} KB. Elige una más liviana.`);
      return;
    }
    onRecargarComprobanteVe(resultado.assets[0].uri, extensionDeImagen(resultado.assets[0]));
  };

  // Botón de respaldo para reenviar manualmente (el envío automático ya
  // ocurre al presionar el check de validación en PeruDashboardView).
  const enlaceWhatsApp = op.check_deposito_ve
    ? construirEnlaceWhatsApp(op.beneficiario_telefono, mensajeConfirmacionDeposito(nombreNegocio, op.beneficiario_banco, formatearBs(op.monto_ves)))
    : null;

  const notificarWhatsApp = async () => {
    if (!enlaceWhatsApp) return;
    const puedeAbrir = await Linking.canOpenURL(enlaceWhatsApp);
    if (!puedeAbrir) {
      Alert.alert('No se pudo abrir WhatsApp', 'Verifica el número del beneficiario.');
      return;
    }
    Linking.openURL(enlaceWhatsApp);
  };

  // Botones de respaldo para avisar al CLIENTE por WhatsApp (el intento
  // automático ya ocurre al marcar cada check, ver validarPeru/validarVe en
  // PeruDashboardView) -- solo se ofrecen si el cliente eligió WhatsApp o
  // Ambos como canal de notificación en su Perfil.
  const clienteQuiereWhatsApp = op.cliente_canal_notificacion !== 'telegram';
  const enlaceWhatsAppClientePeru =
    clienteQuiereWhatsApp && op.check_deposito_peru
      ? construirEnlaceWhatsAppGenerico(op.cliente_telefono, mensajeAvisoClientePeruValidado(op.cliente_nombre, nombreNegocio, op.monto_pen.toFixed(2)))
      : null;
  const enlaceWhatsAppClienteVe =
    clienteQuiereWhatsApp && op.check_deposito_ve
      ? construirEnlaceWhatsAppGenerico(op.cliente_telefono, mensajeAvisoClienteVeValidado(op.cliente_nombre, op.beneficiario_nombre, formatearBs(op.monto_ves)))
      : null;

  const abrirWhatsApp = async (enlace: string | null, mensajeError: string) => {
    if (!enlace) return;
    const puedeAbrir = await Linking.canOpenURL(enlace);
    if (!puedeAbrir) {
      Alert.alert('No se pudo abrir WhatsApp', mensajeError);
      return;
    }
    Linking.openURL(enlace);
  };

  const enlaceWhatsAppOperador = construirEnlaceWhatsAppGenerico(atendidoPorTelefono, `Hola ${atendidoPor ?? ''}, te escribo por una remesa.`);
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
            {FORMATTER_FECHA_HORA.format(new Date(op.created_at))}
          </Text>
          <Text style={styles.cliente} numberOfLines={1}>
            {op.cliente_nombre}
          </Text>
          <Text style={styles.monto}>PEN {op.monto_pen.toFixed(2)}</Text>
        </View>
        <View style={styles.headerChecks}>
          <MiniCheck label="PE" checked={op.check_deposito_peru} />
          <MiniCheck label="VE" checked={op.check_deposito_ve} />
          <Text style={styles.chevron}>{abierto ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {abierto && (
        <View style={styles.detalle}>
          {derivadaDePrincipal && (
            <View style={styles.derivadaBadge}>
              <Text style={styles.derivadaBadgeTexto}>Derivada del Operador principal de Perú</Text>
            </View>
          )}
          {!!atendidoPor && <CopyField label="Atendido por" value={atendidoPor} />}
          {enlaceWhatsAppOperador && (
            <Pressable style={styles.whatsappBtnChico} onPress={contactarOperador}>
              <Text style={styles.whatsappBtnChicoTexto}>Contactar a {atendidoPor} por WhatsApp</Text>
            </Pressable>
          )}
          <CopyField label="Generada" value={FORMATTER_FECHA_HORA.format(new Date(op.created_at))} />
          <CopyField label="Atendida" value={op.check_deposito_ve_at ? FORMATTER_FECHA_HORA.format(new Date(op.check_deposito_ve_at)) : '—'} />
          {op.check_deposito_ve_at && (
            <CopyField label="Tiempo de respuesta total" value={formatearTiempoRespuesta(op.created_at, op.check_deposito_ve_at)} />
          )}
          {/* Todos los campos son copiables (CopyField): el operador los
              necesita para pegarlos al hacer la transferencia. */}
          <CopyField label="Teléfono cliente" value={op.cliente_telefono ?? '—'} />
          <CopyField label="Correo cliente" value={op.cliente_email ?? '—'} />
          <CopyField label="Beneficiario (VE)" value={op.beneficiario_nombre} />
          <CopyField label="C.I." value={op.beneficiario_ci ?? '—'} />
          <CopyField label="Teléfono beneficiario" value={op.beneficiario_telefono ?? '—'} />
          <CopyField label="Tipo de transferencia" value={ETIQUETA_TIPO_TRANSFERENCIA[op.tipo_transferencia]} />
          <CopyField label="Entidad bancaria" value={op.beneficiario_banco} />
          <CopyField label="N° cuenta" value={op.beneficiario_cuenta} />
          <CopyField label="Monto depositado" value={`PEN ${op.monto_pen.toFixed(2)}`} />
          <CopyField label="Forma de pago" value={ETIQUETA_METODO_PAGO[op.metodo_pago]} />
          <CopyField label="Recibe" value={`VES ${op.monto_ves.toFixed(2)}`} />
          {op.check_deposito_peru_at && op.check_deposito_ve_at && (
            <CopyField label="Tramo interno PE → VE" value={formatearTiempoRespuesta(op.check_deposito_peru_at, op.check_deposito_ve_at)} />
          )}
          {op.ganancia && (
            <>
              <CopyField label="Comisión Perú" value={`PEN ${op.ganancia.comisionPeruPen.toFixed(2)}`} />
              <CopyField
                label="Comisión Venezuela"
                value={`VES ${op.ganancia.comisionVenezuelaVes.toFixed(2)} · PEN ${op.ganancia.comisionVenezuelaPen.toFixed(2)}`}
              />
            </>
          )}

          {op.comprobante_pago_url && (
            <ImagenDesplegable titulo="Comprobante de pago en Perú (cliente)" uri={op.comprobante_pago_url} />
          )}
          {op.comprobante_vz_url && (
            <ImagenDesplegable titulo="Comprobante de depósito en Venezuela" uri={op.comprobante_vz_url} />
          )}

          <View style={styles.checksRow}>
            <View style={styles.checkCol}>
              <Text style={styles.checkLabel}>Depósito validado en Perú</Text>
              <RoundCheck
                checked={op.check_deposito_peru}
                disabled={!puedeValidarPeru}
                loading={validandoPeru}
                onPress={onValidarPeru}
              />
              {op.check_deposito_peru_at && (
                <Text style={styles.checkHora}>{FORMATTER_FECHA_HORA.format(new Date(op.check_deposito_peru_at))}</Text>
              )}
              {op.validador_peru_nombre && <Text style={styles.checkValidador}>Validó: {op.validador_peru_nombre}</Text>}
            </View>
            <View style={styles.checkCol}>
              <Text style={styles.checkLabel}>Cargar depósito transferido en Venezuela</Text>
              <RoundCheck
                checked={op.check_deposito_ve}
                disabled={!puedeValidarVe}
                loading={validandoVe}
                onPress={tocarCheckVe}
              />
              {op.check_deposito_ve_at && (
                <Text style={styles.checkHora}>{FORMATTER_HORA_VE.format(new Date(op.check_deposito_ve_at))} (VE)</Text>
              )}
              {op.validador_ve_nombre && <Text style={styles.checkValidador}>Validó: {op.validador_ve_nombre}</Text>}
            </View>
          </View>

          {op.en_revision && (
            <View style={styles.revisionCard}>
              <Text style={styles.revisionTitulo}>⚠️ El cliente reportó que el depósito no llegó a la cuenta del beneficiario</Text>
              {op.en_revision_at && <Text style={styles.checkHora}>Reportado: {FORMATTER_FECHA_HORA.format(new Date(op.en_revision_at))}</Text>}
              {onRecargarComprobanteVe && (
                <Pressable style={styles.recargarBtn} onPress={tocarRecargarComprobante} disabled={recargandoComprobanteVe}>
                  {recargandoComprobanteVe ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={styles.recargarBtnTexto}>🔄 Recargar comprobante de depósito en Venezuela</Text>
                  )}
                </Pressable>
              )}
              <Text style={styles.revisionAyuda}>
                El cliente marcará "resuelto" desde su app apenas confirme que el dinero ya está en la cuenta del beneficiario. También puedes
                marcarlo tú si ya lo verificaste con él.
              </Text>
              <View style={styles.checkCol}>
                <Text style={styles.checkLabel}>Marcar como resuelto</Text>
                <RoundCheck checked={false} loading={resolviendoRevision} onPress={onResolverRevision} />
              </View>
            </View>
          )}

          {enlaceWhatsApp && (
            <Pressable style={styles.whatsappBtn} onPress={notificarWhatsApp}>
              <Text style={styles.whatsappBtnTexto}>Notificar por WhatsApp al beneficiario</Text>
            </Pressable>
          )}
          {enlaceWhatsAppClientePeru && (
            <Pressable
              style={styles.whatsappBtn}
              onPress={() => abrirWhatsApp(enlaceWhatsAppClientePeru, 'Verifica el teléfono del cliente.')}
            >
              <Text style={styles.whatsappBtnTexto}>Notificar por WhatsApp al cliente</Text>
            </Pressable>
          )}
          {enlaceWhatsAppClienteVe && (
            <Pressable
              style={styles.whatsappBtn}
              onPress={() => abrirWhatsApp(enlaceWhatsAppClienteVe, 'Verifica el teléfono del cliente.')}
            >
              <Text style={styles.whatsappBtnTexto}>Notificar por WhatsApp al cliente (depósito en Venezuela)</Text>
            </Pressable>
          )}

          {onDerivar && (
            <Pressable style={styles.derivarBtn} onPress={onDerivar}>
              <Text style={styles.derivarBtnTexto}>Derivar a un operador de Perú →</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function ImagenDesplegable({ titulo, uri }: { titulo: string; uri: string }) {
  const [visible, setVisible] = useState(false);
  const [zoom, setZoom] = useState(false);
  return (
    <View>
      <Pressable style={styles.imagenToggle} onPress={() => setVisible((v) => !v)}>
        <Text style={styles.imagenToggleTexto}>{titulo}</Text>
        <Text style={styles.imagenToggleChevron}>{visible ? '▲' : '▼'}</Text>
      </Pressable>
      {visible && (
        <Pressable onPress={() => setZoom(true)}>
          <Image source={{ uri }} style={styles.comprobante} resizeMode="contain" />
          <Text style={styles.verCompletoTexto}>🔍 Toca para verla completa y hacer zoom</Text>
        </Pressable>
      )}
      <ZoomableImageModal visible={zoom} uri={uri} onClose={() => setZoom(false)} />
    </View>
  );
}

function MiniCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <View style={[styles.mini, checked && styles.miniChecked]}>
      <Text style={[styles.miniTexto, checked && styles.miniTextoChecked]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  headerTextos: { flex: 1, marginRight: 8 },
  // Número y fecha/hora más grandes y visibles (antes 11px, apenas legible).
  fecha: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cliente: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  monto: { color: colors.accent, fontSize: 15, fontWeight: '700', marginTop: 2 },
  headerChecks: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chevron: { color: colors.textMuted, fontSize: 13, marginLeft: 4 },
  mini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniChecked: { backgroundColor: colors.success, borderColor: colors.success },
  miniTexto: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  miniTextoChecked: { color: '#fff' },
  detalle: { borderTopWidth: 1, borderTopColor: colors.border, padding: 14, gap: 8 },
  imagenToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 4,
  },
  imagenToggleTexto: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  imagenToggleChevron: { color: colors.textMuted, fontSize: 12 },
  comprobante: { width: '100%', height: 180, borderRadius: radius.sm, backgroundColor: colors.cardAlt, marginTop: 4 },
  verCompletoTexto: { color: colors.accent, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  checksRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  checkCol: { alignItems: 'center', gap: 6, flex: 1 },
  // Etiquetas de los botones de check más grandes (antes 11px).
  checkLabel: { color: colors.textMuted, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  checkHora: { color: colors.textMuted, fontSize: 13 },
  checkValidador: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 1 },
  whatsappBtn: { backgroundColor: colors.success, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  whatsappBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 17 },
  whatsappBtnChico: { backgroundColor: colors.success, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', alignSelf: 'flex-start' },
  whatsappBtnChicoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  derivadaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.warning}22`,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  derivadaBadgeTexto: { color: colors.warning, fontSize: 14, fontWeight: '800' },
  derivarBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 4 },
  derivarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 16 },
  revisionCard: {
    backgroundColor: `${colors.danger}18`,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 12,
    gap: 8,
    alignItems: 'center',
  },
  revisionTitulo: { color: colors.danger, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  revisionAyuda: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 17 },
  recargarBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  recargarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
