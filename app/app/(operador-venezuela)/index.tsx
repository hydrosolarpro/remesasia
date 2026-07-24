import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PeruDashboardView } from '../../components/PeruDashboardView';
import { colors } from '../../constants/theme';

// El Operador Venezuela ve el mismo panel del Operador Perú al que está
// vinculado (por email, ver migración 0007), en modo restringido: solo
// puede tocar el check verde de "depósito efectuado en Venezuela".
export default function PanelOperadorVenezuela() {
  const { usuario } = useAuth();
  const [operadorPeruId, setOperadorPeruId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from('operador_venezuela_perfil')
      .select('operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => setOperadorPeruId(data?.operador_peru_id ?? null));
  }, [usuario]);

  if (!usuario || operadorPeruId === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!operadorPeruId) {
    return (
      <View style={styles.center}>
        <Text style={styles.aviso}>
          Tu cuenta ({usuario.email}) todavía no está vinculada a ningún negocio. Pide al Operador Perú que
          cargue tu correo en sus datos.
        </Text>
      </View>
    );
  }

  return <PeruDashboardView operadorPeruId={operadorPeruId} nombreUsuarioActual={usuario.nombre} restringido />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  aviso: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
