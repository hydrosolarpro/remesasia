import { PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';

// Angosta el shell general (ver app/_layout.tsx, que ya deja el ancho más
// amplio para operador) dentro de un grupo que quiere quedarse tipo móvil
// de una sola columna (auth, cliente) aunque la ventana sea grande.
export function NarrowShell({ maxWidth, children }: PropsWithChildren<{ maxWidth: number }>) {
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', width: '100%' },
  inner: { flex: 1, width: '100%' },
});
