import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { colors } from '../constants/theme';

/**
 * Campo del % de comisión de un operador (C1/C2, sobre la ganancia bruta --
 * ver lib/tasaCalculo.ts). Guarda el texto tal cual se escribe y solo lo
 * convierte a número al terminar de editar: así se pueden escribir
 * decimales ("2.5", "2,5") y borrar el campo sin que se guarde un 0 a
 * medio escribir. Rechaza valores fuera de 0-100 y muestra si el guardado
 * falló, en vez de dejar en pantalla un % que no quedó en la base.
 */
export function ComisionInput({
  valor,
  onGuardar,
  style,
}: {
  valor: number | null;
  /** Devuelve un mensaje de error si no se pudo guardar, o null si quedó guardado. */
  onGuardar: (pct: number) => Promise<string | null>;
  style?: StyleProp<TextStyle>;
}) {
  const [texto, setTexto] = useState(String(valor ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setTexto(String(valor ?? 0));
  }, [valor]);

  const confirmar = async () => {
    setGuardado(false);
    const pct = Number(texto.trim().replace(',', '.'));
    if (texto.trim() === '' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError('Escribe un porcentaje entre 0 y 100 (ej. 2 o 2.5).');
      setTexto(String(valor ?? 0));
      return;
    }
    if (pct === (valor ?? 0)) {
      setError(null);
      return;
    }
    const err = await onGuardar(pct);
    setError(err);
    if (err) setTexto(String(valor ?? 0));
    else setGuardado(true);
  };

  return (
    <View>
      <TextInput
        style={style}
        value={texto}
        onChangeText={(t) => {
          setTexto(t);
          setError(null);
          setGuardado(false);
        }}
        onBlur={confirmar}
        onSubmitEditing={confirmar}
        keyboardType="decimal-pad"
        returnKeyType="done"
        placeholderTextColor={colors.textMuted}
      />
      {error ? <Text style={styles.error}>{error}</Text> : guardado ? <Text style={styles.ok}>✓ Comisión guardada</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
  ok: { color: colors.success, fontSize: 13, marginTop: 4 },
});
