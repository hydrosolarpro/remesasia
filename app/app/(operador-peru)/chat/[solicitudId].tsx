import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { MensajeChat } from '../../../types/database';
import { colors } from '../../../constants/theme';

/** F13 — Chat interno por solicitud entre Operador Perú y Operador Venezuela (reemplaza WhatsApp entre ellos). */
export default function ChatSolicitud() {
  const { solicitudId } = useLocalSearchParams<{ solicitudId: string }>();
  const { usuario } = useAuth();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    supabase
      .from('mensajes_chat')
      .select('*')
      .eq('solicitud_id', solicitudId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMensajes((data as MensajeChat[]) ?? []));

    const channel = supabase
      .channel(`chat-${solicitudId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_chat', filter: `solicitud_id=eq.${solicitudId}` },
        (payload) => setMensajes((prev) => [...prev, payload.new as MensajeChat])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [solicitudId]);

  const enviar = async () => {
    if (!texto.trim() || !usuario) return;
    await supabase.from('mensajes_chat').insert({
      solicitud_id: solicitudId,
      autor_id: usuario.id,
      autor_rol: usuario.rol,
      mensaje: texto.trim(),
    });
    setTexto('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.list}
        data={mensajes}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.autor_id === usuario?.id ? styles.bubbleMio : styles.bubbleOtro]}>
            <Text style={styles.bubbleRol}>{item.autor_rol === 'operador_peru' ? 'Op. Perú' : 'Op. Venezuela'}</Text>
            <Text style={styles.bubbleTexto}>{item.mensaje}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.sendButton} onPress={enviar}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 10 },
  bubbleMio: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleOtro: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bubbleRol: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  bubbleTexto: { color: colors.text, fontSize: 14 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text },
  sendButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  sendText: { color: colors.text, fontWeight: '700' },
});
