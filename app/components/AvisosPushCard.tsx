import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { activarWebPush, estadoWebPush, reactivarWebPushSiPermitido, EstadoWebPush } from '../lib/webPush';
import { colors, radius } from '../constants/theme';

// Invita al operador a activar los avisos con sonido y mensaje flotante que
// llegan AUNQUE la app/pestaña esté cerrada (Web Push). Si ya está activo no
// muestra nada; solo refresca la suscripción en silencio.
export function AvisosPushCard() {
  const [estado, setEstado] = useState<EstadoWebPush | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [activando, setActivando] = useState(false);

  const refrescar = useCallback(async () => {
    await reactivarWebPushSiPermitido();
    setEstado(await estadoWebPush());
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    refrescar();
  }, [refrescar]);

  if (Platform.OS !== 'web' || estado === null || estado === 'activo' || estado === 'sin_clave') return null;

  const activar = async () => {
    setActivando(true);
    const r = await activarWebPush();
    setActivando(false);
    setMensaje(r.ok ? null : r.motivo ?? null);
    setEstado(await estadoWebPush());
  };

  return (
    <View style={styles.card} accessibilityRole="alert">
      <Text style={styles.titulo}>🔔 Activa los avisos con la app cerrada</Text>
      <Text style={styles.texto}>
        Recibe sonido y un mensaje flotante cada vez que llegue una solicitud nueva o una operación para atender, aunque tengas esta
        pestaña o la app cerrada.
      </Text>
      {estado === 'no_soportado' ? (
        <Text style={styles.aviso}>
          Este navegador no admite avisos push. En iPhone: Compartir → "Agregar a pantalla de inicio" y abre la app desde ahí.
        </Text>
      ) : estado === 'denegado' ? (
        <Text style={styles.aviso}>Bloqueaste las notificaciones. Habilítalas en los ajustes del sitio del navegador y vuelve a abrir la app.</Text>
      ) : (
        <Pressable style={styles.boton} onPress={activar} disabled={activando}>
          <Text style={styles.botonTexto}>{activando ? 'Activando…' : 'Activar avisos con sonido'}</Text>
        </Pressable>
      )}
      {!!mensaje && <Text style={styles.aviso}>{mensaje}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${colors.warning}1A`,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  texto: { color: colors.textMuted, fontSize: 14, lineHeight: 19 },
  aviso: { color: colors.warning, fontSize: 13, fontWeight: '600' },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
