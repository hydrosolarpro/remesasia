import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

// Título de marca — se usa como `headerTitle` en cada Stack/Tabs para que
// se repita en todas las sesiones, dejando el botón de "atrás" nativo intacto.
export function BannerTitle() {
  return (
    <Text style={styles.title} numberOfLines={1}>
      Remesas PERU-VENEZUELA
    </Text>
  );
}

// Banderas PE/VE — se usa como `headerRight`.
export function BannerFlags() {
  return (
    <View style={styles.flagsWrap}>
      <Text style={styles.flags}>🇵🇪 🇻🇪</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  flagsWrap: { paddingRight: 16 },
  flags: { fontSize: 18 },
});
