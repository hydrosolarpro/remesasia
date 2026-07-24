import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ViewStyle, StyleProp } from 'react-native';
import { Solicitud } from '../types/database';
import { RoundCheck } from './RoundCheck';
import { colors, radius, cardShadow } from '../constants/theme';

const FORMATTER_FECHA_HORA = new Intl.DateTimeFormat('es-PE', {
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
}

// Fila de "Operaciones en curso" / "Operaciones realizadas": resumen
// colapsado con nombre/monto, expandible para ver los datos completos y
// la imagen de depósito, con los dos checks verdes de validación.
export function OperationRow({
  op,
  puedeValidarPeru,
  puedeValidarVe,
  onValidarPeru,
  onValidarVe,
  validandoPeru,
  validandoVe,
  style,
}: {
  op: OperationRowData;
  puedeValidarPeru: boolean;
  puedeValidarVe: boolean;
  onValidarPeru: () => void;
  onValidarVe: () => void;
  validandoPeru: boolean;
  validandoVe: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <View style={[styles.card, cardShadow, style]}>
      <Pressable style={styles.header} onPress={() => setAbierto((v) => !v)}>
        <View style={styles.headerTextos}>
          <Text style={styles.fecha}>{FORMATTER_FECHA_HORA.format(new Date(op.created_at))}</Text>
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
          <Row label="Teléfono cliente" value={op.cliente_telefono ?? '—'} />
          <Row label="Beneficiario (VE)" value={op.beneficiario_nombre} />
          <Row label="C.I." value={op.beneficiario_ci ?? '—'} />
          <Row label="Entidad bancaria" value={op.beneficiario_banco} />
          <Row label="N° cuenta" value={op.beneficiario_cuenta} />
          <Row label="Recibe" value={`Bs ${op.monto_ves.toFixed(2)}`} />

          {op.comprobante_pago_url && (
            <Image source={{ uri: op.comprobante_pago_url }} style={styles.comprobante} resizeMode="contain" />
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
            </View>
            <View style={styles.checkCol}>
              <Text style={styles.checkLabel}>Depósito efectuado en Venezuela</Text>
              <RoundCheck
                checked={op.check_deposito_ve}
                disabled={!puedeValidarVe}
                loading={validandoVe}
                onPress={onValidarVe}
              />
              {op.check_deposito_ve_at && (
                <Text style={styles.checkHora}>{FORMATTER_HORA_VE.format(new Date(op.check_deposito_ve_at))} (VE)</Text>
              )}
            </View>
          </View>
        </View>
      )}
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
  fecha: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textMuted, fontSize: 12 },
  rowValue: { color: colors.text, fontSize: 12, fontWeight: '700' },
  comprobante: { width: '100%', height: 180, borderRadius: radius.sm, backgroundColor: colors.cardAlt, marginTop: 4 },
  checksRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  checkCol: { alignItems: 'center', gap: 6, flex: 1 },
  checkLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  checkHora: { color: colors.textMuted, fontSize: 10 },
});
