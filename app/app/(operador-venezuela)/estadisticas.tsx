import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { EstadisticasView } from '../../components/EstadisticasView';
import { colors } from '../../constants/theme';

export default function EstadisticasOperadorVenezuela() {
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
        <Text style={styles.aviso}>Tu cuenta todavía no está vinculada a ningún negocio.</Text>
      </View>
    );
  }

  return <EstadisticasView operadorPeruId={operadorPeruId} restringido />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  aviso: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
