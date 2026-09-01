import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

// Selector de código de país (Perú / Venezuela) + número del abonado, en
// campos separados. El número se guarda solo con dígitos; el código se
// elige con los botones. `telefonoCompleto()` arma el string que entiende
// `normalizar_telefono_e164` en la base.

export const PAISES_TELEFONO = [
  { codigo: '51', bandera: '🇵🇪', nombre: 'Perú', digitos: 9, ejemplo: '9XX XXX XXX' },
  { codigo: '58', bandera: '🇻🇪', nombre: 'Venezuela', digitos: 10, ejemplo: '4XX XXX XXXX' },
] as const;

export function telefonoCompleto(codigo: string, numero: string): string {
  return numero.trim() ? `+${codigo} ${numero.replace(/\D/g, '')}` : '';
}

// Separa un teléfono (en cualquier formato) en { codigo, numero }.
export function separarTelefono(raw?: string | null): { codigo: string; numero: string } {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('58')) return { codigo: '58', numero: d.slice(2, 12) };
  if (d.startsWith('51')) return { codigo: '51', numero: d.slice(2, 11) };
  if (d.length === 11 && d.startsWith('0')) return { codigo: '58', numero: d.slice(1) }; // VE local 04xx…
  if (d.length === 10 && d.startsWith('0')) return { codigo: '51', numero: d.slice(1) }; // PE local 0xxx…
  if (d.length === 10 && d.startsWith('4')) return { codigo: '58', numero: d };
  if (d.length === 9) return { codigo: '51', numero: d };
  return { codigo: '51', numero: d.slice(0, 9) };
}

interface Props {
  codigo: string;
  onCodigo: (v: string) => void;
  numero: string;
  onNumero: (v: string) => void;
}

export function TelefonoInput({ codigo, onCodigo, numero, onNumero }: Props) {
  const pais = PAISES_TELEFONO.find((p) => p.codigo === codigo) ?? PAISES_TELEFONO[0];
  return (
    <View style={styles.wrap}>
      <View style={styles.selector}>
        {PAISES_TELEFONO.map((p) => (
          <Pressable
            key={p.codigo}
            style={[styles.opcion, codigo === p.codigo && styles.opcionActiva]}
            onPress={() => onCodigo(p.codigo)}
          >
            <Text style={[styles.opcionTexto, codigo === p.codigo && styles.opcionTextoActivo]}>
              {p.bandera} +{p.codigo}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.numeroRow}>
        <Text style={styles.prefijo}>+{codigo}</Text>
        <TextInput
          style={styles.input}
          value={numero}
          onChangeText={(t) => onNumero(t.replace(/\D/g, '').slice(0, pais.digitos))}
          keyboardType="number-pad"
          placeholder={pais.ejemplo}
          placeholderTextColor={colors.textMuted}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  selector: { flexDirection: 'row', gap: 8 },
  opcion: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  opcionActiva: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  opcionTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  opcionTextoActivo: { color: colors.text },
  numeroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefijo: {
    color: colors.textMuted,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 17,
    backgroundColor: colors.cardAlt,
  },
});
