import { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { OperadorVenezuelaPerfil, Usuario } from '../../types/database';
import { InstalarAppCard } from '../../components/InstalarAppCard';
import { PinAccesoCard } from '../../components/PinAccesoCard';
import { colors, radius, cardShadow } from '../../constants/theme';

// El Operador Venezuela ve, en solo lectura, los datos del Operador
// principal de Perú y su % de comisión asignada. El equipo de Perú
// asignado a este VE ya no se gestiona acá -- se ve y se contacta desde el
// panel de operaciones (cada solicitud muestra quién la atiende).
export default function Perfil() {
  const { usuario } = useAuth();
  const [veRow, setVeRow] = useState<OperadorVenezuelaPerfil | null>(null);
  const [principal, setPrincipal] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const { data: perfil } = await supabase
      .from('operador_venezuela_perfil')
      .select('*')
      .eq('usuario_id', usuario.id)
      .maybeSingle();
    const row = perfil as OperadorVenezuelaPerfil | null;
    setVeRow(row);
    if (row) {
      const { data: principalData } = await supabase.from('usuarios').select('*').eq('id', row.operador_peru_id).maybeSingle();
      setPrincipal((principalData as Usuario | null) ?? null);
    }
    setCargando(false);
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!usuario || cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.rolTitulo}>OPERADOR DE VENEZUELA</Text>
      <Text style={styles.nombre}>{usuario.nombre}</Text>
      <Text style={styles.email}>{usuario.email}</Text>
      <Text style={styles.telefono}>{usuario.telefono ?? 'Sin teléfono'}</Text>

      {/* Datos del Operador principal de Perú: solo lectura, siempre primero */}
      {principal && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>OPERADOR PRINCIPAL DE PERÚ</Text>
          <Text style={styles.miembroNombre}>{principal.nombre}</Text>
          <Text style={styles.miembroDato}>{principal.email}</Text>
          <Text style={styles.miembroDato}>{principal.telefono ?? 'Sin teléfono'}</Text>
        </View>
      )}

      {/* % de comisión: lo asigna el Operador principal, acá solo se ve. */}
      {veRow && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>% Comisión asignada</Text>
          <Text style={styles.miembroNombre}>{veRow.comision_pct ?? 0}%</Text>
        </View>
      )}

      <PinAccesoCard />

      <InstalarAppCard puedeEnviar />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  rolTitulo: { color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  nombre: { color: colors.text, fontSize: 25, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 16, marginTop: -8 },
  telefono: { color: colors.textMuted, fontSize: 16, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  miembroNombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  miembroDato: { color: colors.textMuted, fontSize: 14 },
});
