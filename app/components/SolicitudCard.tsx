import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Solicitud } from '../types/database';
import { formatearBs } from '../lib/formato';
import { EstadoBadge } from './EstadoBadge';
import { colors, radius, cardShadow } from '../constants/theme';

export function SolicitudCard({ solicitud, onPress }: { solicitud: Solicitud; onPress?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      style={[styles.card, cardShadow, hover && styles.cardHover]}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
    >
      <View style={styles.row}>
        <Text style={styles.id}>#{solicitud.id.slice(0, 8)}</Text>
        <EstadoBadge estado={solicitud.estado} />
      </View>
      <Text style={styles.beneficiario}>{solicitud.beneficiario_nombre}</Text>
      <View style={styles.row}>
        <Text style={styles.monto}>PEN {solicitud.monto_pen.toFixed(2)}</Text>
        <Text style={styles.montoVes}>VES {formatearBs(solicitud.monto_ves)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    gap: 8,
  },
  cardHover: { borderColor: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  beneficiario: { color: colors.text, fontSize: 18, fontWeight: '700' },
  monto: { color: colors.text, fontSize: 16 },
  montoVes: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
