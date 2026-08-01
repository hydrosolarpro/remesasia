import { useEffect, useState } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../constants/theme';

const FORMATTER_FECHA = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const FORMATTER_HORA = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

// Fecha y hora en tiempo real (Perú), se actualiza cada segundo.
export function LiveClock({ style }: { style?: TextStyle }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fecha = FORMATTER_FECHA.format(now);
  const texto = fecha.charAt(0).toUpperCase() + fecha.slice(1);

  return (
    <Text style={[styles.text, style]}>
      {texto} · {FORMATTER_HORA.format(now)}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
});
