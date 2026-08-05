import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { PeruDashboardView } from '../../components/PeruDashboardView';
import { resolverContextoOperador, ContextoOperador } from '../../lib/sesionOperador';
import { AccesoNegocioGate } from '../../components/AccesoNegocioGate';
import { colors } from '../../constants/theme';

export default function PanelOperadorPeru() {
  const { usuario } = useAuth();
  const [ctx, setCtx] = useState<ContextoOperador | null>(null);

  useEffect(() => {
    if (!usuario) return;
    resolverContextoOperador(usuario)
      .then(setCtx)
      .catch((e) => console.error('Error resolviendo contexto de operador:', e));
  }, [usuario]);

  if (!usuario || !ctx) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!ctx.negocioId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 16, lineHeight: 20 }}>
          Todavía no encontramos tu equipo vinculado. Pide al Operador principal de Perú que verifique que tu correo esté
          registrado correctamente en su Perfil, y vuelve a entrar a la app.
        </Text>
      </View>
    );
  }

  return (
    <AccesoNegocioGate operadorPeruId={ctx.negocioId} rolParaAviso="operador_peru">
      <PeruDashboardView
        operadorPeruId={ctx.negocioId}
        nombreUsuarioActual={usuario.nombre}
        tipoSesion={ctx.tipo}
        miembroId={ctx.miembroId}
      />
    </AccesoNegocioGate>
  );
}
