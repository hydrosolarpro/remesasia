import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PeruDashboardView } from '../../components/PeruDashboardView';
import { obtenerMiembrosAsignadosAlVe } from '../../lib/sesionOperador';
import { AccesoNegocioGate } from '../../components/AccesoNegocioGate';
import { colors } from '../../constants/theme';

export default function PanelOperadorVenezuela() {
  const { usuario } = useAuth();
  const [operadorPeruId, setOperadorPeruId] = useState<string | null | undefined>(undefined);
  const [veId, setVeId] = useState<string | null>(null);
  const [miembrosAsignados, setMiembrosAsignados] = useState<string[]>([]);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        const { data: p, error: pErr } = await supabase
          .from('operador_venezuela_perfil')
          .select('id, operador_peru_id')
          .eq('usuario_id', usuario.id)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!p) {
          setOperadorPeruId(null);
          return;
        }

        setOperadorPeruId(p.operador_peru_id);
        setVeId(p.id);
        setMiembrosAsignados(await obtenerMiembrosAsignadosAlVe(p.id));
      } catch (e) {
        console.error('Error resolviendo perfil de Operador Venezuela:', e);
        setOperadorPeruId(null);
      }
    })();
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
          No encontramos tu perfil de Operador Venezuela para este correo. Contacta al Operador principal de Perú para que
          verifique que tu correo esté registrado en &quot;OPERADORES EN VENEZUELA - EQUIPO&quot; en su panel, y vuelve a entrar
          a la app.
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
    <AccesoNegocioGate operadorPeruId={operadorPeruId} rolParaAviso="operador_venezuela">
      <PeruDashboardView
        operadorPeruId={operadorPeruId}
        nombreUsuarioActual={usuario.nombre}
        tipoSesion="venezuela"
        veId={veId}
        miembrosAsignadosIds={miembrosAsignados}
      />
    </AccesoNegocioGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  aviso: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 20 },
});
