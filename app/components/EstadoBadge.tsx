import { View, Text, StyleSheet } from 'react-native';
import { EstadoSolicitud } from '../types/database';
import { colors, estadoColor, estadoLabel } from '../constants/theme';

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const color = estadoColor[estado] ?? colors.textMuted;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{estadoLabel[estado] ?? estado}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
