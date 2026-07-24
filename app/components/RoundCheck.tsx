import { Pressable, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { colors } from '../constants/theme';

// Check verde circular. `checked` deshabilita el toque (una vez validado no
// se puede desmarcar desde la UI). `disabled` cubre el caso de permisos
// (p. ej. el operador Venezuela no puede tocar el check de Perú).
export function RoundCheck({
  checked,
  onPress,
  disabled,
  loading,
  size = 30,
}: {
  checked: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      onPress={checked || disabled || loading ? undefined : onPress}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: checked ? colors.success : 'transparent',
          borderColor: checked ? colors.success : colors.border,
          opacity: disabled && !checked ? 0.4 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : checked ? (
        <Text style={[styles.mark, { fontSize: size * 0.55 }]}>✓</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { color: '#fff', fontWeight: '900' },
});
