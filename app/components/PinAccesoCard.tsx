import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { miEstadoPin, EstadoPin, vincularCorreoSesion, esCorreoPinSintetico } from '../lib/pinAuth';
import { colors, radius, cardShadow } from '../constants/theme';

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tarjeta de Perfil: acceso con teléfono + PIN de 4 dígitos, alternativo a
// "Continuar con Google". Muestra si ya está activado y lleva a la
// pantalla para crearlo / cambiarlo. Debajo, el correo de la sesión: para
// una cuenta creada por PIN (correo sintético) permite poner el correo
// real, que pasa a ser el de su Perfil y le habilita "Continuar con
// Google" con ese mismo correo.
export function PinAccesoCard() {
  const { usuario, refreshUsuario } = useAuth();
  const [estado, setEstado] = useState<EstadoPin | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      miEstadoPin().then((e) => {
        if (vivo) setEstado(e);
      });
      return () => {
        vivo = false;
      };
    }, [])
  );

  const tienePin = !!estado?.tiene_pin;

  const correoActual = usuario?.email ?? null;
  const correoEsSintetico = esCorreoPinSintetico(correoActual) || !correoActual;

  const [editandoCorreo, setEditandoCorreo] = useState(false);
  const [correo, setCorreo] = useState('');
  const [correo2, setCorreo2] = useState('');
  const [guardandoCorreo, setGuardandoCorreo] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
  const [correoGuardado, setCorreoGuardado] = useState(false);

  const mostrarFormularioCorreo = correoEsSintetico || editandoCorreo;
  const correosCoinciden = correo.trim().length > 0 && correo.trim().toLowerCase() === correo2.trim().toLowerCase();

  const limpiarCorreo = () => {
    setCorreo('');
    setCorreo2('');
    setErrorCorreo(null);
  };

  const guardarCorreo = async () => {
    setErrorCorreo(null);
    setCorreoGuardado(false);
    const valor = correo.trim().toLowerCase();
    if (!RE_EMAIL.test(valor)) {
      setErrorCorreo('Escribe un correo válido (ejemplo: nombre@gmail.com).');
      return;
    }
    if (valor !== correo2.trim().toLowerCase()) {
      setErrorCorreo('Los dos correos no coinciden. Escríbelo igual en ambos campos.');
      return;
    }
    setGuardandoCorreo(true);
    try {
      await vincularCorreoSesion(valor);
      await refreshUsuario();
      setCorreoGuardado(true);
      setEditandoCorreo(false);
      setCorreo('');
      setCorreo2('');
    } catch (err) {
      setErrorCorreo(err instanceof Error ? err.message : 'No se pudo vincular el correo.');
    } finally {
      setGuardandoCorreo(false);
    }
  };

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.titulo}>Acceso con teléfono + PIN</Text>
      <Text style={styles.texto}>
        {tienePin
          ? `Activado${estado?.telefono ? ` con el teléfono +${estado.telefono}` : ''}. Puedes entrar con tu número y tu PIN, o con Google.`
          : 'Todavía no lo activaste. Actívalo para entrar con tu número de teléfono sin usar Google.'}
      </Text>
      <Pressable style={styles.boton} onPress={() => router.push('/(auth)/nuevo-pin')}>
        <Text style={styles.botonTexto}>{tienePin ? 'Cambiar mi PIN' : 'Activar acceso con PIN'}</Text>
      </Pressable>

      <View style={styles.separador} />

      <Text style={styles.subtitulo}>Correo para entrar también con Google</Text>

      {!correoEsSintetico && (
        <Text style={styles.texto}>
          Tu correo: <Text style={styles.correoActual}>{correoActual}</Text>. También puedes entrar con
          «Continuar con Google» usando este correo.
        </Text>
      )}

      {correoEsSintetico && (
        <Text style={styles.texto}>
          Tu cuenta aún no tiene un correo tuyo. Agrégalo para que aparezca en tu Perfil y para poder entrar
          también con «Continuar con Google».
        </Text>
      )}

      {mostrarFormularioCorreo ? (
        <>
          <TextInput
            style={styles.input}
            value={correo}
            onChangeText={(t) => setCorreo(t.replace(/\s/g, ''))}
            placeholder="tucorreo@gmail.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
          />
          <TextInput
            style={styles.input}
            value={correo2}
            onChangeText={(t) => setCorreo2(t.replace(/\s/g, ''))}
            placeholder="Repite tu correo"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
          />
          {correo2.trim().length > 0 && (
            <Text style={correosCoinciden ? styles.ok : styles.error}>
              {correosCoinciden ? '✓ Los dos correos coinciden.' : 'Los dos correos aún no coinciden.'}
            </Text>
          )}
          <Text style={styles.aviso}>
            Usa un correo válido y tuyo (Gmail u otro). Para entrar con Google te pedirá la contraseña de ese
            correo: es privada y solo tú la conoces. No se verifica que exista, así que revísalo bien.
          </Text>
          {errorCorreo ? <Text style={styles.error}>{errorCorreo}</Text> : null}
          <View style={styles.filaBotones}>
            <Pressable
              style={[styles.boton, (!correosCoinciden || guardandoCorreo) && styles.botonDeshabilitado]}
              onPress={guardarCorreo}
              disabled={guardandoCorreo || !correosCoinciden}
            >
              {guardandoCorreo ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.botonTexto}>Guardar correo</Text>
              )}
            </Pressable>
            {!correoEsSintetico && (
              <Pressable
                style={styles.botonSecundario}
                onPress={() => {
                  setEditandoCorreo(false);
                  limpiarCorreo();
                }}
                disabled={guardandoCorreo}
              >
                <Text style={styles.botonSecundarioTexto}>Cancelar</Text>
              </Pressable>
            )}
          </View>
        </>
      ) : (
        <Pressable style={styles.botonSecundario} onPress={() => setEditandoCorreo(true)}>
          <Text style={styles.botonSecundarioTexto}>Cambiar correo</Text>
        </Pressable>
      )}

      {correoGuardado ? <Text style={styles.ok}>Correo vinculado. Ya puedes entrar con Google con ese correo.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  subtitulo: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
  texto: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  correoActual: { color: colors.text, fontWeight: '700' },
  separador: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.cardAlt,
  },
  aviso: { color: colors.warning, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, fontSize: 13 },
  ok: { color: colors.success, fontSize: 13, fontWeight: '600' },
  filaBotones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  boton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  botonDeshabilitado: { opacity: 0.4 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  botonSecundario: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  botonSecundarioTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
});
