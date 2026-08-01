import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { registrarPushToken } from '../../lib/notifications';
import { reservarPestanaExterna } from '../../lib/pestanaExterna';
import { construirEnlaceWhatsAppGenerico } from '../../lib/whatsapp';
import { colors, radius } from '../../constants/theme';

const BOT_TELEGRAM = 'Remesaspv_bot';

// Edición de datos en la misma pantalla (sin navegar a otra ruta): antes
// "Editar mis datos" llevaba a /(auth)/registro (una pantalla ajena a este
// grupo de tabs) y al volver con router.replace('/(cliente)') se veía un
// salto a pantalla blanca. Editando in-place evitamos ese remount y el
// usuario nunca sale de la pestaña Perfil.
export default function Perfil() {
  const { usuario, refreshUsuario } = useAuth();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [conectandoTelegram, setConectandoTelegram] = useState(false);
  const [operador, setOperador] = useState<{ nombre: string; telefono: string | null } | null>(null);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  // Contacto de soporte: el operador principal de Perú del negocio al que
  // pertenece el cliente (no hay un registro de "quién lo atendió" a nivel
  // general, así que se usa el dueño del negocio como contacto por defecto).
  useEffect(() => {
    if (!usuario?.negocio_operador_peru_id) return;
    supabase
      .from('usuarios')
      .select('nombre, telefono')
      .eq('id', usuario.negocio_operador_peru_id)
      .maybeSingle()
      .then(({ data }) => setOperador(data));
  }, [usuario?.negocio_operador_peru_id]);

  const enlaceWhatsAppOperador = operador
    ? construirEnlaceWhatsAppGenerico(operador.telefono, 'Hola, necesito ayuda con una solicitud en Remesas PERU-VENEZUELA.')
    : null;

  const contactarOperador = () => {
    if (!enlaceWhatsAppOperador) return;
    Linking.openURL(enlaceWhatsAppOperador);
  };

  // Al volver a esta pantalla (p.ej. tras vincular Telegram y regresar del
  // navegador/app de Telegram) se refresca el usuario para reflejar el
  // nuevo estado de conexión sin que el cliente tenga que hacer nada más.
  useFocusEffect(
    useCallback(() => {
      refreshUsuario();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const conectarTelegram = async () => {
    setConectandoTelegram(true);
    const pestana = reservarPestanaExterna();
    const { data: token, error: tokenError } = await supabase.rpc('generar_token_telegram_propio');
    setConectandoTelegram(false);
    if (tokenError || !token) {
      pestana.asignar(null);
      return;
    }
    pestana.asignar(`https://t.me/${BOT_TELEGRAM}?start=${token}`);
  };

  const empezarEdicion = () => {
    setNombre(usuario?.nombre ?? '');
    setTelefono(usuario?.telefono ?? '');
    setPais(usuario?.pais ?? '');
    setError(null);
    setGuardado(false);
    setEditando(true);
  };

  const cancelar = () => {
    setEditando(false);
    setError(null);
  };

  const guardar = async () => {
    if (!usuario) return;
    setError(null);
    if (!nombre.trim() || !telefono.trim() || !pais.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    setGuardando(true);
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ nombre: nombre.trim(), telefono: telefono.trim(), pais: pais.trim() })
      .eq('id', usuario.id);
    setGuardando(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshUsuario();
    setEditando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  if (editando) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.tituloPagina}>Perfil y Contacto</Text>
        <Text style={styles.nombre}>Editar mis datos</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          placeholder="+51 999 999 999"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>País</Text>
        <TextInput style={styles.input} value={pais} onChangeText={setPais} placeholderTextColor={colors.textMuted} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Guardar</Text>}
        </Pressable>
        <Pressable style={styles.buttonOutline} onPress={cancelar} disabled={guardando}>
          <Text style={styles.buttonOutlineText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.tituloPagina}>Perfil y Contacto</Text>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Cliente'}</Text>
      <Text style={styles.dato}>{usuario?.email}</Text>
      <Text style={styles.dato}>{usuario?.telefono}</Text>
      <Text style={styles.datoUltimo}>{usuario?.pais}</Text>

      {guardado && <Text style={styles.exito}>✓ Datos guardados satisfactoriamente</Text>}

      <Pressable style={styles.buttonOutline} onPress={empezarEdicion}>
        <Text style={styles.buttonOutlineText}>Editar mis datos</Text>
      </Pressable>

      <View style={styles.telegramCard}>
        <Text style={styles.telegramTitulo}>Notificaciones por Telegram</Text>
        {usuario?.telegram_connected ? (
          <Text style={styles.exito}>✓ Telegram conectado{usuario.telegram_username ? ` (@${usuario.telegram_username})` : ''}</Text>
        ) : (
          <>
            <Text style={styles.telegramDato}>Conecta tu Telegram para recibir el aviso apenas se valide tu depósito en Perú.</Text>
            <Pressable style={styles.buttonOutline} onPress={conectarTelegram} disabled={conectandoTelegram}>
              {conectandoTelegram ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.buttonOutlineText}>Conectar Telegram</Text>}
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.contactoCard}>
        <Text style={styles.telegramTitulo}>Contacto de soporte</Text>
        <Text style={styles.telegramDato}>
          Para resolver situaciones que no puedan resolverse con el flujo de trabajo en el aplicativo, comunícate directamente
          {operador?.nombre ? ` con ${operador.nombre}` : ' con tu operador'}.
        </Text>
        {enlaceWhatsAppOperador ? (
          <Pressable style={styles.whatsappBtn} onPress={contactarOperador}>
            <Text style={styles.whatsappBtnTexto} numberOfLines={2}>
              Enviar WhatsApp{operador?.nombre ? ` a ${operador.nombre}` : ''}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.telegramDato}>Aún no hay un teléfono de contacto configurado.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, gap: 12, paddingBottom: 48 },
  tituloPagina: { color: colors.text, fontSize: 23, fontWeight: '800', flexShrink: 1, flexWrap: 'wrap' },
  nombre: { color: colors.text, fontSize: 25, fontWeight: '800', flexShrink: 1, flexWrap: 'wrap' },
  dato: { color: colors.textMuted, fontSize: 16, marginTop: -8 },
  datoUltimo: { color: colors.textMuted, fontSize: 16, marginTop: -8, marginBottom: 12 },
  exito: { color: colors.success, fontSize: 15, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 15, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    fontSize: 18,
    marginTop: 6,
    backgroundColor: colors.card,
  },
  error: { color: colors.danger, fontSize: 15 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 18 },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
  telegramCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, gap: 10, marginTop: 8 },
  telegramTitulo: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1, flexWrap: 'wrap' },
  telegramDato: { color: colors.textMuted, fontSize: 15, flexShrink: 1, flexWrap: 'wrap' },
  contactoCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, gap: 10, marginTop: 8 },
  whatsappBtn: { backgroundColor: colors.success, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  whatsappBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center', flexShrink: 1, flexWrap: 'wrap' },
});
