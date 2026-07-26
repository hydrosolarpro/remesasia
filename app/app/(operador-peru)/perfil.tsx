import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { obtenerOCrearInvitacionCliente, construirEnlaceInvitacion } from '../../lib/invitaciones';
import { OperadorVenezuelaPerfil, OperadorPeruMiembro } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

export default function Perfil() {
  const { usuario, signOut } = useAuth();
  const [negocioId, setNegocioId] = useState<string | null | undefined>(undefined);
  const [enlaceCliente, setEnlaceCliente] = useState<string | null>(null);
  const [generando, setGenerando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [veList, setVeList] = useState<OperadorVenezuelaPerfil[]>([]);
  const [peList, setPeList] = useState<OperadorPeruMiembro[]>([]);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === 'operador_peru') {
      setNegocioId(usuario.id);
      return;
    }
    supabase
      .from('operador_peru_miembro')
      .select('operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => setNegocioId(data?.operador_peru_id ?? null));
  }, [usuario]);

  // El enlace es único por negocio y reutilizable: se busca (o se crea la
  // primera vez) apenas entra a esta pantalla, sin necesidad de un botón.
  useEffect(() => {
    if (!negocioId) return;
    obtenerOCrearInvitacionCliente(negocioId)
      .then((inv) => setEnlaceCliente(construirEnlaceInvitacion(inv.token)))
      .finally(() => setGenerando(false));
  }, [negocioId]);

  useEffect(() => {
    if (!negocioId) return;
    supabase
      .from('operador_venezuela_perfil')
      .select('*')
      .eq('operador_peru_id', negocioId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setVeList((data as OperadorVenezuelaPerfil[] | null) ?? []));
    supabase
      .from('operador_peru_miembro')
      .select('*')
      .eq('operador_peru_id', negocioId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setPeList((data as OperadorPeruMiembro[] | null) ?? []));
  }, [negocioId]);

  const copiarEnlace = async () => {
    if (!enlaceCliente) return;
    await Clipboard.setStringAsync(enlaceCliente);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Operador Perú'}</Text>
      <Text style={styles.email}>{usuario?.email}</Text>
      <Text style={styles.telefono}>{usuario?.telefono}</Text>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>Invitar clientes</Text>
        <Text style={styles.cardTexto}>
          Un solo enlace para todos tus clientes — compártelo por WhatsApp. Quien lo abra entra directo como tu cliente.
        </Text>
        {generando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : (
          enlaceCliente && (
            <View style={styles.enlaceRow}>
              <Text style={styles.enlaceTexto} numberOfLines={1}>
                {enlaceCliente}
              </Text>
              <Pressable style={styles.copiarBtn} onPress={copiarEnlace}>
                <Text style={styles.copiarBtnTexto}>{copiado ? '✓ Copiado' : 'Copiar'}</Text>
              </Pressable>
            </View>
          )
        )}
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>Operadores Venezuela ({veList.length})</Text>
        {veList.length === 0 && <Text style={styles.cardTexto}>Todavía no hay ninguno registrado.</Text>}
        {veList.map((v) => (
          <View key={v.id} style={styles.miembroFila}>
            <Text style={styles.miembroNombre}>{v.nombre}</Text>
            <Text style={styles.miembroDato}>{v.email}</Text>
            {v.telefono && <Text style={styles.miembroDato}>{v.telefono}</Text>}
          </View>
        ))}
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>Operadores Perú — equipo ({peList.length})</Text>
        {peList.length === 0 && <Text style={styles.cardTexto}>Todavía no hay ningún miembro agregado.</Text>}
        {peList.map((p) => (
          <View key={p.id} style={styles.miembroFila}>
            <Text style={styles.miembroNombre}>{p.nombre}</Text>
            <Text style={styles.miembroDato}>{p.email}</Text>
            {p.telefono && <Text style={styles.miembroDato}>{p.telefono}</Text>}
          </View>
        ))}
        <Text style={styles.cardTextoChico}>Para agregar, editar o quitar operadores, ve a la pestaña "Panel".</Text>
      </View>

      {usuario?.rol === 'operador_peru' && (
        <Pressable style={styles.buttonOutline} onPress={() => router.push('/(operador-peru)/onboarding')}>
          <Text style={styles.buttonOutlineText}>Editar datos del negocio</Text>
        </Pressable>
      )}

      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 14, marginTop: -8 },
  telefono: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cardTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  cardTextoChico: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 4, fontStyle: 'italic' },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  botonTexto: { color: colors.text, fontWeight: '700' },
  enlaceRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  enlaceTexto: { flex: 1, color: colors.accent, fontSize: 12 },
  copiarBtn: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  copiarBtnTexto: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  miembroFila: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
  miembroNombre: { color: colors.text, fontSize: 14, fontWeight: '700' },
  miembroDato: { color: colors.textMuted, fontSize: 12 },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
  button: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.danger, fontWeight: '700' },
});
