import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PeruDashboardView } from '../../components/PeruDashboardView';
import { colors } from '../../constants/theme';

export default function PanelOperadorPeru() {
  const { usuario } = useAuth();
  const [negocioId, setNegocioId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === 'operador_peru') {
      setNegocioId(usuario.id);
      return;
    }
    // Miembro de equipo: su negocio es el del dueño que lo agregó, no el
    // suyo propio.
    supabase
      .from('operador_peru_miembro')
      .select('operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => setNegocioId(data?.operador_peru_id ?? null));
  }, [usuario]);

  if (!usuario || negocioId === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!negocioId) return null;

  return (
    <PeruDashboardView
      operadorPeruId={negocioId}
      nombreUsuarioActual={usuario.nombre}
      restringido={false}
      esMiembroPe={usuario.rol === 'operador_peru_miembro'}
    />
  );
}
