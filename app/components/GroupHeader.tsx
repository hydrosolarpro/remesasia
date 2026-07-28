import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { BannerTitle, BannerFlags } from './AppBanner';
import { PlanBadge } from './PlanBadge';

// Banner manual (título + banderas) para grupos que necesitan decidir qué
// renderizar ANTES de montar su navegador de pestañas (p. ej. el gate de
// suscripción del Operador Perú) — en esos casos Tabs no puede dibujar su
// propio header porque todavía no sabemos si se va a mostrar Tabs o la
// pantalla de pago, así que el banner vive un nivel arriba, siempre visible.
export function GroupHeader({ operadorPeruId }: { operadorPeruId?: string | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <BannerTitle />
      <View>
        <BannerFlags />
        {operadorPeruId !== undefined && <PlanBadge operadorPeruId={operadorPeruId} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
});
