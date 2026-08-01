import { View, Text, StyleSheet } from 'react-native';
import { RoleTag } from './RoleTag';
import { Rol } from '../types/database';
import { colors, radius, cardShadow } from '../constants/theme';

// Pantalla pasiva compartida por las 3 sesiones (Operador Perú, Operador
// Venezuela, Cliente) cuando el negocio quedó sin acceso: DEMO vencido y
// todavía sin plan STARTER activo. Sin formulario ni acciones -- solo el
// aviso, porque únicamente el dueño del negocio (Operador Perú) puede
// resolverlo desde su propia sesión.
export function AccesoPendienteAviso({ rol, etiqueta }: { rol: Rol; etiqueta?: string }) {
  return (
    <View style={styles.center}>
      <RoleTag rol={rol} etiqueta={etiqueta} />
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.titulo}>Pronto se apertura el acceso a Remesas PERÚ-VENEZUELA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 20,
    gap: 6,
    maxWidth: 420,
  },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 22 },
});
