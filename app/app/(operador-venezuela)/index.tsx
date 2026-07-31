import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PeruDashboardView } from '../../components/PeruDashboardView';
import { obtenerMiembrosAsignadosAlVe } from '../../lib/sesionOperador';
import { colors } from '../../constants/theme';

// El Operador Venezuela ve SOLO las operaciones de los operadores de Perú
// (miembros) que el Operador principal le asignó. Puede tocar el check
// verde de "depósito efectuado en Venezuela" de esas operaciones.
export default function PanelOperadorVenezuela() {
  const { usuario } = useAuth();
  const [operadorPeruId, setOperadorPeruId] = useState<string | null | undefined>(undefined);
  const [veId, setVeId] = useState<string | null>(null);
  const [miembrosAsignados, setMiembrosAsignados] = useState<string[]>([]);

  useEffect(() => {
    if (!usuario) return;
    supabase
      .from('operador_venezuela_perfil')
      .select('id, operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        setOperadorPeruId(data.operador_peru_id);
        setVeId(data.id);
        setMiembrosAsignados(await obtenerMiembrosAsignadosAlVe(data.id));
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
        <Text style={styles.aviso}>
          Tu cuenta ({usuario.email}) todavía no está vinculada a ningún negocio. Pide al Operador principal de Perú que
          cargue tu correo en sus datos.
        </Text>
      </View>
    );
  }

  if (veId && miembrosAsignados.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.aviso}>
          Todavía no tienes operadores de Perú asignados. El Operador principal de Perú asignará a los operadores de Perú
          que deberás atender en Venezuela.
        </Text>
      </View>
    );
  }

  return (
    <PeruDashboardView
      operadorPeruId={operadorPeruId}
      nombreUsuarioActual={usuario.nombre}
      tipoSesion="venezuela"
      miembrosAsignadosIds={miembrosAsignados}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  aviso: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
