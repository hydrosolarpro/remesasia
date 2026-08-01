import { useState, PropsWithChildren, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

// Cuadro desplegable genérico: encabezado siempre visible (título +
// subtítulo opcional) que abre/cierra el contenido al tocarlo. Se usa tanto
// para las secciones de Perfil (Tu plan, equipos) como para cada fila de
// operador individual dentro de ellas.
export function Collapsible({
  titulo,
  subtitulo,
  abiertoPorDefecto = false,
  extra,
  children,
}: PropsWithChildren<{
  titulo: string;
  subtitulo?: string;
  abiertoPorDefecto?: boolean;
  /** Elemento extra a la derecha del encabezado, antes de la flecha (p.ej. un botón eliminar). */
  extra?: ReactNode;
}>) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto);
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setAbierto((v) => !v)}>
        <View style={styles.headerTextos}>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
        </View>
        {extra}
        <Text style={styles.flecha}>{abierto ? '▲' : '▼'}</Text>
      </Pressable>
      {abierto && <View style={styles.contenido}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.cardAlt },
  headerTextos: { flex: 1, gap: 1 },
  titulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 12 },
  flecha: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  contenido: { padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: colors.border },
});
