import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { provisionarPin, enlaceWaEnviarPin } from '../lib/pinAuth';
import { TelefonoInput, telefonoCompleto } from './TelefonoInput';
import { colors, radius, cardShadow } from '../constants/theme';

// Alta de un cliente que entrará SOLO con teléfono + PIN, sin pasar nunca
// por Google. Crea el acceso pendiente (queda guardado) y abre un enlace
// wa.me con el PIN temporal. El cliente entra con su número y ese PIN, y
// en el primer ingreso define su PIN definitivo. Si lo olvida, el operador
// lo regenera desde la tarjeta del cliente y se lo reenvía por wa.me.
export function ProvisionarClientePin({ miembroId, onCreado }: { miembroId: string | null; onCreado?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('51');
  const [numero, setNumero] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinCreado, setPinCreado] = useState<{ pin: string; telefono: string } | null>(null);

  const crear = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('Escribe el nombre del cliente.');
      return;
    }
    if (!numero.trim()) {
      setError('Escribe el número de teléfono.');
      return;
    }
    setEnviando(true);
    try {
      const { pin, telefono: tel } = await provisionarPin('cliente', miembroId, telefonoCompleto(codigo, numero), nombre.trim());
      setPinCreado({ pin, telefono: tel });
      Linking.openURL(enlaceWaEnviarPin(tel, pin)).catch(() => {
        if (Platform.OS === 'web') window.alert(`PIN temporal: ${pin} para +${tel}. Envíaselo por WhatsApp.`);
      });
      setNombre('');
      setNumero('');
      onCreado?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el acceso.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.cardTitulo}>Dar acceso a un cliente con PIN (sin Google)</Text>
      <Text style={styles.cardTexto}>
        Para clientes que prefieren no usar Google: creas su acceso con teléfono + PIN y se lo envías por WhatsApp. Entra con
        su número y el PIN; en el primer ingreso define su PIN definitivo.
      </Text>

      {!abierto ? (
        <Pressable style={styles.boton} onPress={() => setAbierto(true)}>
          <Text style={styles.botonTexto}>+ Crear acceso con PIN</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Nombre del cliente</Text>
          <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholderTextColor={colors.textMuted} />
          <Text style={styles.label}>País y número de teléfono</Text>
          <TelefonoInput codigo={codigo} onCodigo={setCodigo} numero={numero} onNumero={setNumero} />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.acciones}>
            <Pressable style={styles.boton} onPress={crear} disabled={enviando}>
              {enviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.botonTexto}>Crear y enviar por WhatsApp</Text>}
            </Pressable>
            <Pressable style={styles.cancelar} onPress={() => setAbierto(false)} disabled={enviando}>
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {pinCreado && (
        <Text style={styles.pinAviso}>
          Acceso creado. PIN temporal: <Text style={styles.pinNum}>{pinCreado.pin}</Text> (para +{pinCreado.telefono}). Se
          muestra solo ahora; si no se abrió WhatsApp, cópialo y envíalo tú.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  cardTexto: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.cardAlt,
  },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  boton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  cancelar: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  cancelarTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  error: { color: colors.danger, fontSize: 13 },
  pinAviso: { color: colors.warning, fontSize: 12, lineHeight: 16, marginTop: 4 },
  pinNum: { color: colors.text, fontWeight: '900', fontSize: 14 },
});
