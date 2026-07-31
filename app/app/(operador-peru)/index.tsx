import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { PeruDashboardView } from '../../components/PeruDashboardView';
import { resolverContextoOperador, ContextoOperador } from '../../lib/sesionOperador';
import { colors } from '../../constants/theme';

export default function PanelOperadorPeru() {
  const { usuario } = useAuth();
  const [ctx, setCtx] = useState<ContextoOperador | null>(null);

  useEffect(() => {
    if (!usuario) return;
    resolverContextoOperador(usuario).then(setCtx);
  }, [usuario]);

  if (!usuario || !ctx) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!ctx.negocioId) return null;

  return (
    <PeruDashboardView
      operadorPeruId={ctx.negocioId}
      nombreUsuarioActual={usuario.nombre}
      tipoSesion={ctx.tipo}
      miembroId={ctx.miembroId}
    />
  );
}
