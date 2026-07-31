import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { PeruDashboardView } from '../../components/PeruDashboardView';
import { resolverContextoOperador, ContextoOperador } from '../../lib/sesionOperador';
import { AccesoNegocioGate } from '../../components/AccesoNegocioGate';
import { colors } from '../../constants/theme';

export default function PanelOperadorPeru() {
  const { usuario } = useAuth();
  const [ctx, setCtx] = useState<ContextoOperador | null>(null);

  const [errorDebug, setErrorDebug] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        // Verificar si el usuario existe en la tabla usuarios
        const { data: u, error: uErr } = await supabase.from('usuarios').select('*').eq('id', usuario.id).maybeSingle();
        if (uErr) throw new Error('Error usuarios: ' + uErr.message);
        if (!u) throw new Error('El usuario no existe en la tabla "usuarios"');

        const ctx = await resolverContextoOperador(usuario);
        console.log('Contexto:', ctx);
        setCtx(ctx);
        if (!ctx.negocioId) {
           setErrorDebug(`Rol: ${u.rol}. El sistema no encontró un negocio vinculado. ¿El perfil está bien creado en la tabla de miembros?`);
        }
      } catch (e: any) {
        setErrorDebug(e.message);
      }
    })();
  }, [usuario]);

  if (errorDebug) {
    return <View style={{flex:1, padding: 20, justifyContent: 'center'}}><Text style={{color: 'red'}}>ERROR: {errorDebug}</Text></View>;
  }

  if (!usuario || !ctx) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!ctx.negocioId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>
          Error de vinculación: No se encontró el negocio. {"\n\n"}
          Contexto recibido: {JSON.stringify(ctx)}
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
