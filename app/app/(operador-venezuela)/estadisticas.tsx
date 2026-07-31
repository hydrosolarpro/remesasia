import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { obtenerMiembrosAsignadosAlVe } from '../../lib/sesionOperador';
import { EstadisticasView } from '../../components/EstadisticasView';
import { colors } from '../../constants/theme';

export default function EstadisticasOperadorVenezuela() {
  const { usuario } = useAuth();
  const [operadorPeruId, setOperadorPeruId] = useState<string | null | undefined>(undefined);
  const [veId, setVeId] = useState<string | null>(null);
  const [miembrosAsignadosIds, setMiembrosAsignadosIds] = useState<string[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from('operador_venezuela_perfil')
      .select('id, operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(async ({ data }) => {
        const perfil = data as { id: string; operador_peru_id: string } | null;
        if (!perfil) {
          setOperadorPeruId(null);
          return;
        }
        const opId = perfil.operador_peru_id;
        setOperadorPeruId(opId);
        if (!opId) return;
        setCargandoMiembros(true);
        const miembrosIds = await obtenerMiembrosAsignadosAlVe(perfil.id);
        setVeId(perfil.id);
        setMiembrosAsignadosIds(miembrosIds);
        setCargandoMiembros(false);
      });
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

  if (cargandoMiembros) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <EstadisticasView
      operadorPeruId={operadorPeruId}
      restringido
      tipoSesion="venezuela"
      veId={veId}
      miembrosAsignadosIds={miembrosAsignadosIds}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  aviso: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
