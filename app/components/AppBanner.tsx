import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { FlagPeru, FlagVenezuela } from './FlagIcon';

const FORMATTER_COMPACTO = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

// Título de marca + fecha/hora en tiempo real — se usa como `headerTitle`
// en cada Stack/Tabs para que se repita en todas las sesiones, dejando el
// botón de "atrás" nativo intacto.
export function BannerTitle() {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <View>
      <Text style={styles.title} numberOfLines={1}>
        Remesas PERU-VENEZUELA
      </Text>
      <Text style={styles.reloj} numberOfLines={1}>
        {FORMATTER_COMPACTO.format(ahora)}
      </Text>
    </View>
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  reloj: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  flagsWrap: { flexDirection: 'row', gap: 6, paddingRight: 16, alignItems: 'center' },
});
