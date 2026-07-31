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

  const [errorDebug, setErrorDebug] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        const { data: u, error: uErr } = await supabase.from('usuarios').select('*').eq('id', usuario.id).maybeSingle();
        if (uErr) throw new Error('Error usuarios: ' + uErr.message);
        if (!u) throw new Error('El usuario no existe en la tabla "usuarios"');

        const { data: p, error: pErr } = await supabase
          .from('operador_venezuela_perfil')
          .select('id, operador_peru_id')
          .eq('usuario_id', usuario.id)
          .maybeSingle();

        if (pErr) throw new Error('Error perfil VE: ' + pErr.message);
        if (!p) {
          setErrorDebug(`Rol: ${u.rol}. No se encontró tu perfil de Operador Venezuela. Verifica tu correo en el panel principal.`);
          return;
        }

        setOperadorPeruId(p.operador_peru_id);
        setVeId(p.id);
        setMiembrosAsignados(await obtenerMiembrosAsignadosAlVe(p.id));
      } catch (e: any) {
        setErrorDebug(e.message);
      }
    })();
  }, [usuario]);

  if (errorDebug) {
    return <View style={styles.center}><Text style={{color: 'red', textAlign: 'center'}}>{errorDebug}</Text></View>;
  }

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
          Error de vinculación: No se encontró perfil de Operador Venezuela para este correo. {"\n\n"}
          ID de usuario: {usuario.id} {"\n\n"}
          Si crees que esto es un error, contacta al Operador principal de Perú para que verifique que tu correo esté registrado en "OPERADORES EN VENEZUELA - EQUIPO" en su panel.
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
        miembrosAsignadosIds={miembrosAsignados}
      />
    </AccesoNegocioGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  aviso: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
