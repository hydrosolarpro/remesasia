import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { audioWebListo, desbloquearAudioWeb, tocarCicloWeb } from './alarmaSonido';

const CLAVE_HABILITADA = 'alarma_operador_habilitada';
// Un ciclo dura ~1.5 s; el hueco entre ciclos deja respirar sin perder urgencia.
const INTERVALO_CICLO_MS = 2600;
// Si el operador silencia pero la solicitud sigue sin atender, vuelve a sonar.
const REPETIR_SI_SIGUE_MS = 2 * 60 * 1000;
const VIBRACION_MS = [0, 450, 250, 450];

/**
 * Alarma de solicitudes pendientes para las 3 sesiones de operador.
 *
 * - Empieza a sonar apenas aparece un id nuevo en `pendientesIds` y repite
 *   el ciclo hasta que el operador toca "Silenciar" o la lista se vacía
 *   (porque ya atendió todo).
 * - Si se silencia pero algo sigue pendiente, vuelve a sonar a los 2 min.
 * - Web: Web Audio sintetizado + título de pestaña parpadeante +
 *   vibración (móvil) + notificación del navegador si la pestaña está
 *   oculta + pantalla encendida (Wake Lock) para que el celular no se
 *   bloquee con la alarma esperando.
 * - Los navegadores bloquean el audio hasta el primer toque: por eso
 *   `audioBloqueado` y `activarAudio` (el banner invita a tocar).
 */
export type PendienteAlarma = { id: string; /** Texto del mensaje emergente, ej. "Juan Pérez · PEN 500.00". */ resumen: string };

export function useAlarmaOperador(pendientes: PendienteAlarma[]) {
  const pendientesIds = pendientes.map((p) => p.id);
  const [nuevas, setNuevas] = useState<string[]>([]);
  const player = useAudioPlayer(require('../assets/sounds/alerta.wav'));
  const esWeb = Platform.OS === 'web';

  const [sonando, setSonando] = useState(false);
  const [habilitada, setHabilitada] = useState(true);
  const [audioBloqueado, setAudioBloqueado] = useState(esWeb && !audioWebListo());

  const conocidosRef = useRef<Set<string>>(new Set());
  const cantidadRef = useRef(0);
  const sonandoRef = useRef(false);
  const habilitadaRef = useRef(true);
  sonandoRef.current = sonando;
  habilitadaRef.current = habilitada;
  cantidadRef.current = pendientesIds.length;

  const tocarCiclo = useCallback(() => {
    if (esWeb) {
      const ok = tocarCicloWeb();
      if (ok && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(VIBRACION_MS);
      return;
    }
    try {
      player.volume = 1.0;
      player.seekTo(0);
      player.play();
      Vibration.vibrate(VIBRACION_MS);
    } catch {
      // Sin reproductor disponible: se reintenta en el próximo ciclo.
    }
  }, [esWeb, player]);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_HABILITADA)
      .then((v) => {
        if (v === '0') setHabilitada(false);
      })
      .catch(() => {});
  }, []);

  // Detección: id nuevo => suena (mirar ids y no la cantidad evita perder un
  // aviso cuando una se atiende justo cuando llega otra).
  const clave = pendientesIds.join('|');
  useEffect(() => {
    const recienLlegadas = pendientes.filter((p) => !conocidosRef.current.has(p.id)).map((p) => p.resumen);
    conocidosRef.current = new Set(pendientesIds);
    if (pendientesIds.length === 0) {
      setSonando(false);
    } else if (recienLlegadas.length > 0 && habilitadaRef.current) {
      // Si el mensaje anterior sigue abierto, las nuevas se suman encima.
      setNuevas((prev) => (sonandoRef.current ? [...recienLlegadas, ...prev] : recienLlegadas));
      setSonando(true);
      avisarEnSegundoPlano(recienLlegadas);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Insistencia: silenciada pero sigue pendiente => vuelve a sonar.
  useEffect(() => {
    const id = setInterval(() => {
      if (cantidadRef.current > 0 && habilitadaRef.current && !sonandoRef.current) setSonando(true);
    }, REPETIR_SI_SIGUE_MS);
    return () => clearInterval(id);
  }, []);

  // Ciclo sonoro + vibración + título parpadeante mientras `sonando`.
  useEffect(() => {
    if (!sonando) return;
    tocarCiclo();
    const idSonido = setInterval(tocarCiclo, INTERVALO_CICLO_MS);

    let idTitulo: ReturnType<typeof setInterval> | undefined;
    const tituloOriginal = esWeb && typeof document !== 'undefined' ? document.title : '';
    if (esWeb && typeof document !== 'undefined') {
      let alterno = false;
      idTitulo = setInterval(() => {
        alterno = !alterno;
        document.title = alterno ? '🔔 ¡NUEVA SOLICITUD!' : tituloOriginal;
      }, 900);
    }

    return () => {
      clearInterval(idSonido);
      if (idTitulo) clearInterval(idTitulo);
      if (esWeb && typeof document !== 'undefined') document.title = tituloOriginal;
      if (esWeb) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(0);
      } else {
        Vibration.cancel();
      }
    };
  }, [sonando, tocarCiclo, esWeb]);

  // Desbloqueo automático con el primer gesto en cualquier parte de la página.
  useEffect(() => {
    if (!esWeb || typeof document === 'undefined') return;
    const desbloquear = async () => {
      const ok = await desbloquearAudioWeb();
      setAudioBloqueado(!ok);
      if (ok) {
        quitar();
        if (sonandoRef.current) tocarCiclo();
      }
    };
    const eventos = ['pointerdown', 'touchstart', 'keydown', 'click'] as const;
    const quitar = () => eventos.forEach((e) => document.removeEventListener(e, desbloquear));
    if (!audioWebListo()) eventos.forEach((e) => document.addEventListener(e, desbloquear));
    return quitar;
  }, [esWeb, tocarCiclo]);

  // Pantalla encendida mientras el panel esté abierto y el audio activo: un
  // celular bloqueado suspende la página y la alarma no podría sonar.
  useEffect(() => {
    if (!esWeb || audioBloqueado || typeof navigator === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wakeLock = (navigator as any).wakeLock;
    if (!wakeLock) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sentinela: any = null;
    let cancelado = false;
    const pedir = async () => {
      try {
        const s = await wakeLock.request('screen');
        if (cancelado) s.release();
        else sentinela = s;
      } catch {
        // Denegado (ahorro de batería, etc.): la alarma funciona igual.
      }
    };
    const alVolver = () => {
      if (document.visibilityState === 'visible') pedir();
    };
    pedir();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alVolver);
      sentinela?.release?.().catch?.(() => {});
    };
  }, [esWeb, audioBloqueado]);

  const activarAudio = useCallback(async () => {
    if (!esWeb) return;
    const ok = await desbloquearAudioWeb();
    setAudioBloqueado(!ok);
    // El permiso se pide en el mismo gesto del toque, como exige el navegador.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    if (ok && sonandoRef.current) tocarCiclo();
  }, [esWeb, tocarCiclo]);

  const silenciar = useCallback(() => setSonando(false), []);

  const alternarHabilitada = useCallback(() => {
    const nueva = !habilitadaRef.current;
    setHabilitada(nueva);
    if (!nueva) setSonando(false);
    AsyncStorage.setItem(CLAVE_HABILITADA, nueva ? '1' : '0').catch(() => {});
  }, []);

  /** Un solo ciclo, para que el operador compruebe el volumen. */
  const probar = useCallback(async () => {
    if (esWeb) await desbloquearAudioWeb();
    setAudioBloqueado(esWeb && !audioWebListo());
    tocarCiclo();
  }, [esWeb, tocarCiclo]);

  return { sonando, nuevas, habilitada, audioBloqueado, cantidad: pendientesIds.length, silenciar, alternarHabilitada, activarAudio, probar };
}

/** Notificación del sistema si la pestaña está oculta (requiere permiso concedido). */
function avisarEnSegundoPlano(resumenes: string[]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof Notification === 'undefined') return;
  if (!document.hidden || Notification.permission !== 'granted') return;
  try {
    new Notification('💰 ¡Nueva solicitud!', {
      body: resumenes.length === 1 ? resumenes[0] : `${resumenes[0]} y ${resumenes.length - 1} más`,
      tag: 'remesas-alarma',
      renotify: true,
      requireInteraction: true,
    } as NotificationOptions);
  } catch {
    // Algunos móviles exigen service worker para notificar; se ignora.
  }
}
