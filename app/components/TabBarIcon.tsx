import { View, Text, StyleSheet, ColorValue } from 'react-native';
import { colors } from '../constants/theme';

// Ícono de pestaña compartido por las 3 sesiones con barra inferior
// (cliente, operador Perú, operador Venezuela): cuando la pestaña está
// activa, dibuja una píldora de fondo detrás del emoji para que quede
// claro de un vistazo en qué parte del menú está el usuario (antes solo
// cambiaba el color del ícono/etiqueta, poco visible).
export function TabBarIcon({
  emoji,
  color,
  focused,
  peligro = false,
}: {
  emoji: string;
  color: ColorValue;
  focused: boolean;
  /** Para "Cerrar sesión": siempre en rojo, sin importar el color activo/inactivo que pase el navegador. */
  peligro?: boolean;
}) {
  return (
    <View style={[styles.wrap, focused && styles.wrapActivo]}>
      <Text style={{ fontSize: 18, color: peligro ? colors.danger : color }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 36, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  wrapActivo: { backgroundColor: `${colors.primary}22` },
});
