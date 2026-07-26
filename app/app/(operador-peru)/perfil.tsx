import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { obtenerOCrearInvitacionCliente, construirEnlaceInvitacion } from '../../lib/invitaciones';
import { colors, radius, cardShadow } from '../../constants/theme';

export default function Perfil() {
  const { usuario, signOut } = useAuth();
  const [enlaceCliente, setEnlaceCliente] = useState<string | null>(null);
  const [generando, setGenerando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  // El enlace es único por operador y reutilizable: se busca (o se crea la
  // primera vez) apenas entra a esta pantalla, sin necesidad de un botón.
  useEffect(() => {
    if (!usuario) return;
    obtenerOCrearInvitacionCliente(usuario.id)
      .then((inv) => setEnlaceCliente(construirEnlaceInvitacion(inv.token)))
      .finally(() => setGenerando(false));
  }, [usuario]);

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

      <Pressable style={styles.buttonOutline} onPress={() => router.push('/(operador-peru)/onboarding')}>
        <Text style={styles.buttonOutlineText}>Editar datos del negocio</Text>
      </Pressable>

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
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  botonTexto: { color: colors.text, fontWeight: '700' },
  enlaceRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  enlaceTexto: { flex: 1, color: colors.accent, fontSize: 12 },
  copiarBtn: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  copiarBtnTexto: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
  button: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonText: { color: colors.danger, fontWeight: '700' },
});
