import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';

/**
 * Sonido de alerta compartido por las 3 sesiones (cliente, operador Perú,
 * operador Venezuela): campanilla de notificación corta, a volumen
 * máximo, para que sea bien audible. Los navegadores bloquean el audio si
 * la página no tuvo ninguna interacción todavía -- por eso el catch
 * silencioso; en cuanto el usuario toque algo en la pantalla, las
 * siguientes alertas suenan normal.
 */
export function useAlertaSonora() {
  const player = useAudioPlayer(require('../assets/sounds/alerta.wav'));

  return useCallback(() => {
    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
    } catch {
      // Bloqueado por política de autoplay; se reintentará en la próxima
      // alerta o apenas el usuario interactúe con la página.
    }
  }, [player]);
}
