import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ViewStyle, StyleProp, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Solicitud } from '../types/database';
import { RoundCheck } from './RoundCheck';
import { CopyField } from './CopyField';
import { construirEnlaceWhatsApp, mensajeConfirmacionDeposito } from '../lib/whatsapp';
import { formatearBs } from '../lib/formato';
import { extensionDeImagen } from '../lib/imagenUtil';
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
  validador_peru_nombre: string | null;
  validador_ve_nombre: string | null;
  /** Nombre del operador de Perú miembro que atiende la operación (null = el Operador principal). */
  operador_peru_atiende?: string | null;
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

// "Tiempo de respuesta" = diferencia entre el check de Perú y el de
// Venezuela. Si cae en el mismo día solo se muestra horas/minutos; si cruza
// de día se agrega la cantidad de días de diferencia.
export function formatearTiempoRespuesta(peruAt: string, veAt: string): string {
  const a = new Date(peruAt).getTime();
  const b = new Date(veAt).getTime();
  const diffMs = Math.abs(b - a);
  const mismoDia = peruAt.slice(0, 10) === veAt.slice(0, 10);
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
  atendidoPor,
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
  /** Nombre del operador de Perú que atiende esta operación (p.ej. "Operador principal de Perú"). */
  atendidoPor?: string;
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
    onValidarVe(resultado.assets[0].uri, extensionDeImagen(resultado.assets[0]));
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
          <Text style={styles.monto}>S/ {op.monto_pen.toFixed(2)}</Text>
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
          <CopyField label="Monto depositado" value={`S/ ${op.monto_pen.toFixed(2)}`} />
          <CopyField label="Forma de pago" value={ETIQUETA_METODO_PAGO[op.metodo_pago]} />
          <CopyField label="Recibe" value={`Bs ${op.monto_ves.toFixed(2)}`} />
          {op.check_deposito_peru_at && op.check_deposito_ve_at && (
            <CopyField label="Tiempo de respuesta" value={formatearTiempoRespuesta(op.check_deposito_peru_at, op.check_deposito_ve_at)} />
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
  return (
    <View>
      <Pressable style={styles.imagenToggle} onPress={() => setVisible((v) => !v)}>
        <Text style={styles.imagenToggleTexto}>{titulo}</Text>
        <Text style={styles.imagenToggleChevron}>{visible ? '▲' : '▼'}</Text>
      </Pressable>
      {visible && <Image source={{ uri }} style={styles.comprobante} resizeMode="contain" />}
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
  fecha: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cliente: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  monto: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 2 },
  headerChecks: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chevron: { color: colors.textMuted, fontSize: 11, marginLeft: 4 },
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
  miniTexto: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
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
  imagenToggleTexto: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  imagenToggleChevron: { color: colors.textMuted, fontSize: 10 },
  comprobante: { width: '100%', height: 180, borderRadius: radius.sm, backgroundColor: colors.cardAlt, marginTop: 4 },
  checksRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  checkCol: { alignItems: 'center', gap: 6, flex: 1 },
  // Etiquetas de los botones de check más grandes (antes 11px).
  checkLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  checkHora: { color: colors.textMuted, fontSize: 11 },
  checkValidador: { color: colors.accent, fontSize: 11, fontWeight: '700', marginTop: 1 },
  whatsappBtn: { backgroundColor: colors.success, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  whatsappBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
  derivadaBadgeTexto: { color: colors.warning, fontSize: 12, fontWeight: '800' },
  derivarBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 4 },
  derivarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
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
  revisionTitulo: { color: colors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
