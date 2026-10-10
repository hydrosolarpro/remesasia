import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, cardShadow } from '../constants/theme';

export function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    gap: 5,
  },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  value: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: colors.accent, fontSize: 13, fontWeight: '600' },
});
