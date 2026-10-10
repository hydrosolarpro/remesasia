import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { colors, radius } from '../constants/theme';

// Selector de corredor (país de recepción -> país de entrega) en el login.
// Cada corredor es una app independiente (su propio despliegue y su propia
// base de datos); este selector solo lleva al login del corredor elegido.
// Para activar un corredor nuevo, completa su `url` aquí (y en el mismo
// selector de las demás apps).
interface Corredor {
  id: string;
  etiqueta: string;
  url: string | null;
}

export const CORREDOR_ACTUAL = 'colombia-venezuela';

export const CORREDORES: Corredor[] = [
  { id: 'peru-venezuela', etiqueta: '🇵🇪 Perú → 🇻🇪 Venezuela', url: 'https://remesasia.vercel.app' },
  { id: 'colombia-venezuela', etiqueta: '🇨🇴 Colombia → 🇻🇪 Venezuela', url: null },
  { id: 'chile-venezuela', etiqueta: '🇨🇱 Chile → 🇻🇪 Venezuela', url: null },
  { id: 'otro-venezuela', etiqueta: '🌎 Otro país → 🇻🇪 Venezuela', url: null },
];

function abrir(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(url);
  else Linking.openURL(url);
}

export function SelectorCorredor() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Corredor de remesas</Text>
      <View style={styles.fila}>
        {CORREDORES.map((c) => {
          const activo = c.id === CORREDOR_ACTUAL;
          const disponible = activo || !!c.url;
          return (
            <Pressable
              key={c.id}
              disabled={!disponible || activo}
              onPress={() => c.url && abrir(c.url)}
              style={[styles.chip, activo && styles.chipActivo, !disponible && styles.chipDeshabilitado]}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{c.etiqueta}</Text>
              {!disponible ? <Text style={styles.pronto}>Próximamente</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, gap: 6 },
  titulo: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  fila: { gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipDeshabilitado: { opacity: 0.5 },
  chipTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  chipTextoActivo: { color: colors.text },
  pronto: { color: colors.textMuted, fontSize: 12 },
});
