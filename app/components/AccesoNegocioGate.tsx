import { PropsWithChildren, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { demoVencido } from '../lib/plan';
import { AccesoPendienteAviso } from './AccesoPendienteAviso';
import { Rol } from '../types/database';
import { colors } from '../constants/theme';

// Candado liviano (solo lectura, sin formulario de pago) para las sesiones
// de Operador Venezuela y Cliente: si el negocio al que pertenecen se
// quedó sin acceso (DEMO vencido y todavía sin plan STARTER), bloquea con
// el mismo aviso pasivo que ve el propio Operador Perú en SuscripcionGate
// -- solo el dueño del negocio puede resolverlo (solicitando STARTER desde
// su Perfil), así que acá no hay ningún formulario, solo el mensaje.
export function AccesoNegocioGate({
  operadorPeruId,
  rolParaAviso,
  children,
}: PropsWithChildren<{ operadorPeruId: string | null | undefined; rolParaAviso: Rol }>) {
  const [cargando, setCargando] = useState(true);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    if (!operadorPeruId) {
      setCargando(false);
      setBloqueado(false);
      return;
    }
    let cancelado = false;
    setCargando(true);
    supabase
      .from('usuarios')
      .select('plan, demo_inicio, acceso_concedido')
      .eq('id', operadorPeruId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return;
        if (!data) setBloqueado(false);
        else if (data.plan === 'demo') setBloqueado(demoVencido(data.demo_inicio));
        else setBloqueado(!data.acceso_concedido);
        setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [operadorPeruId]);

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (bloqueado) {
    return <AccesoPendienteAviso rol={rolParaAviso} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
});
