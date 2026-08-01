import { View, Text, StyleSheet } from 'react-native';
import { Rol } from '../types/database';
import { roleColors, roleLabel, radius } from '../constants/theme';
import { FlagPeru, FlagVenezuela } from './FlagIcon';

// Insignia de rol — deja siempre claro en qué "sesión" estás parado, sobre
// todo porque el Operador Venezuela ve la misma pantalla que el Operador
// Perú (en modo restringido). `etiqueta` permite sobreescribir el texto
// (p. ej. "Operador Venezuela · Solo lectura").
export function RoleTag({ rol, etiqueta }: { rol: Rol; etiqueta?: string }) {
  const color = roleColors[rol];
  return (
    <View style={[styles.wrap, { borderColor: color, backgroundColor: `${color}1F` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      {rol === 'operador_peru' && <FlagPeru width={16} height={11} />}
      {rol === 'operador_venezuela' && <FlagVenezuela width={16} height={11} />}
      <Text style={[styles.texto, { color }]}>{etiqueta ?? roleLabel[rol]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  texto: { fontSize: 14, fontWeight: '700' },
});
