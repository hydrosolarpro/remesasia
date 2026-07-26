import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, radius } from '../constants/theme';
import { FlagPeru, FlagVenezuela } from './FlagIcon';
import { useAuth } from '../lib/auth';
import { Rol } from '../types/database';

const HOME_POR_ROL: Record<Rol, string> = {
  administrador: '/(admin)',
  operador_peru: '/(operador-peru)',
  operador_peru_miembro: '/(operador-peru)',
  operador_venezuela: '/(operador-venezuela)',
  cliente: '/(cliente)',
};

const FORMATTER_COMPACTO = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

// Título de marca + fecha/hora en tiempo real — se usa como `headerTitle`
// en cada Stack/Tabs para que se repita en todas las sesiones, dejando el
// botón de "atrás" nativo intacto.
export function BannerTitle() {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <View>
      <Text style={styles.title} numberOfLines={1}>
        Remesas PERU-VENEZUELA
      </Text>
      <Text style={styles.reloj} numberOfLines={1}>
        {FORMATTER_COMPACTO.format(ahora)}
      </Text>
    </View>
  );
}

// Botón "Inicio" + banderas PE/VE — se usa como `headerRight`. El botón
// vuelve al dashboard inicial de la sesión que corresponda según el rol
// del usuario logueado, disponible desde cualquier pantalla. Las
// banderas están dibujadas en SVG (no emoji): los emoji de bandera no se
// renderizan en Windows/Chrome.
export function BannerFlags() {
  const { usuario } = useAuth();

  return (
    <View style={styles.flagsWrap}>
      {usuario && (
        <Pressable
          style={styles.inicioBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => router.replace(HOME_POR_ROL[usuario.rol] as never)}
        >
          <Text style={styles.inicioBtnTexto}>Inicio</Text>
        </Pressable>
      )}
      <FlagPeru width={22} height={15} />
      <FlagVenezuela width={22} height={15} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  reloj: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  flagsWrap: { flexDirection: 'row', gap: 10, paddingRight: 16, alignItems: 'center' },
  inicioBtn: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inicioBtnTexto: { color: colors.accent, fontSize: 11, fontWeight: '700' },
});
