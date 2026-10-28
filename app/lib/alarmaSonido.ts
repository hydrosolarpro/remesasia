import { Platform } from 'react-native';

// Motor de sonido de la alarma de operadores (solo web). El sonido se
// sintetiza con Web Audio en vez de usar un archivo: así no hay descarga,
// el volumen es el máximo que permite el dispositivo (pasa por un
// compresor para que no distorsione) y el patrón -- un "¡cha-ching!" de
// caja registradora, estilo aviso de venta de Hotmart -- se repite sin
// huecos. En nativo se usa el WAV de assets/sounds (ver useAlarmaOperador).

let ctx: AudioContext | null = null;
let salida: GainNode | null = null;

function obtenerContexto(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  if (!ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor: typeof AudioContext | undefined = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    const compresor = ctx.createDynamicsCompressor();
    compresor.threshold.value = -14;
    compresor.ratio.value = 8;
    salida = ctx.createGain();
    salida.gain.value = 1;
    salida.connect(compresor);
    compresor.connect(ctx.destination);
  }
  return ctx;
}

/** Campana: tono triangular + armónico, con ataque seco y caída exponencial. */
function campana(c: AudioContext, frecuencia: number, inicio: number, duracion: number, fuerza: number) {
  const parciales: { mult: number; tipo: OscillatorType; nivel: number }[] = [
    { mult: 1, tipo: 'triangle', nivel: 0.55 },
    { mult: 2.01, tipo: 'sine', nivel: 0.3 },
    { mult: 3.02, tipo: 'sine', nivel: 0.12 },
  ];
  for (const p of parciales) {
    const osc = c.createOscillator();
    const ganancia = c.createGain();
    osc.type = p.tipo;
    osc.frequency.value = frecuencia * p.mult;
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(p.nivel * fuerza, inicio + 0.008);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    osc.connect(ganancia);
    ganancia.connect(salida!);
    osc.start(inicio);
    osc.stop(inicio + duracion + 0.05);
  }
}

/** "Cha": ráfaga corta de ruido filtrado, el golpe de la caja registradora. */
function golpeCaja(c: AudioContext, inicio: number) {
  const largo = Math.floor(c.sampleRate * 0.09);
  const buffer = c.createBuffer(1, largo, c.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < largo; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / largo);
  const fuente = c.createBufferSource();
  fuente.buffer = buffer;
  const filtro = c.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 3200;
  filtro.Q.value = 0.8;
  const ganancia = c.createGain();
  ganancia.gain.value = 1.4;
  fuente.connect(filtro);
  filtro.connect(ganancia);
  ganancia.connect(salida!);
  fuente.start(inicio);
}

/**
 * "¡Cha-ching!" de caja registradora (el aviso de venta de Hotmart): golpe
 * de ruido + campanas agudas con cola larga. Se tocan dos seguidas para
 * que no pase desapercibido. ~1.6 s en total.
 */
export function tocarCicloWeb(): boolean {
  const c = obtenerContexto();
  if (!c || c.state !== 'running') return false;
  const base = c.currentTime + 0.02;
  for (const desfase of [0, 0.8]) {
    const t = base + desfase;
    golpeCaja(c, t);
    campana(c, 2637, t + 0.07, 1.0, 1); // Mi7
    campana(c, 3520, t + 0.13, 1.1, 1); // La7
    campana(c, 1760, t + 0.07, 0.6, 0.7); // cuerpo grave de la moneda
  }
  return true;
}

/** Debe llamarse desde un gesto del usuario (toque/clic/tecla). */
export async function desbloquearAudioWeb(): Promise<boolean> {
  const c = obtenerContexto();
  if (!c) return false;
  if (c.state !== 'running') {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === 'running';
}

export function audioWebListo(): boolean {
  return ctx?.state === 'running';
}
