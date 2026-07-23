import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

export function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.card}>
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
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  label: { color: colors.textMuted, fontSize: 12 },
  value: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 11 },
});
