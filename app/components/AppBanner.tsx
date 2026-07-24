import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { FlagPeru, FlagVenezuela } from './FlagIcon';

// Título de marca — se usa como `headerTitle` en cada Stack/Tabs para que
// se repita en todas las sesiones, dejando el botón de "atrás" nativo intacto.
export function BannerTitle() {
  return (
    <Text style={styles.title} numberOfLines={1}>
      Remesas PERU-VENEZUELA
    </Text>
  );
}

// Banderas PE/VE — se usa como `headerRight`. Dibujadas en SVG (no emoji):
// los emoji de bandera no se renderizan en Windows/Chrome.
export function BannerFlags() {
  return (
    <View style={styles.flagsWrap}>
      <FlagPeru width={22} height={15} />
      <FlagVenezuela width={22} height={15} />
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
  flagsWrap: { flexDirection: 'row', gap: 6, paddingRight: 16, alignItems: 'center' },
});
