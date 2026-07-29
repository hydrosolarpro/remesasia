import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Sparkles, Disc, Radio } from 'lucide-react';

export const BackgroundMusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.25);
  const [activeStyle, setActiveStyle] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const volumeRef = useRef<number>(0.25);
  const nextNoteTimeRef = useRef<number>(0);
  const stepRef = useRef<number>(0);
  const timerIdRef = useRef<number | null>(null);

  // Sync refs with state
  useEffect(() => {
    isMutedRef.current = isMuted;
    volumeRef.current = volume;
  }, [isMuted, volume]);

  // Two catchy track styles: 0: Modern Latin Synth Pop (Inspiring), 1: Uplifting Electro Hope
  const tracks = [
    {
      name: "Ritmo Éxito & Esperanza",
      bpm: 122,
      // Fmaj7 -> G -> Am -> C progression frequencies
      chordFreqs: [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 392.00], // G
        [220.00, 261.63, 329.63, 392.00], // Am
        [261.63, 329.63, 392.00, 523.25], // C
      ],
      bassFreqs: [87.31, 98.00, 110.00, 130.81],
      melodyPattern: [0, 2, 3, 1, 2, 3, 4, 2, 0, 3, 2, 4, 3, 1, 2, 0],
    },
    {
      name: "Motivación Perú-Venezuela",
      bpm: 116,
      // C -> Em -> Am -> F progression
      chordFreqs: [
        [261.63, 329.63, 392.00, 523.25], // C
        [164.81, 246.94, 329.63, 392.00], // Em
        [220.00, 261.63, 329.63, 440.00], // Am
        [174.61, 220.00, 261.63, 349.23], // F
      ],
      bassFreqs: [130.81, 82.41, 110.00, 87.31],
      melodyPattern: [2, 0, 3, 1, 4, 2, 1, 3, 0, 2, 4, 1, 3, 2, 0, 4],
    }
  ];

  // Synthesize white noise for percussion (hi-hats & snares)
  const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const scheduleNotes = () => {
    if (!audioCtxRef.current || !isPlayingRef.current) return;

    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const track = tracks[activeStyle];
    const stepDuration = 60 / track.bpm / 4; // 16th note duration

    while (nextNoteTimeRef.current < now + 0.25) {
      const step = stepRef.current % 16;
      const measure = Math.floor(stepRef.current / 16);
      const chordIdx = Math.floor(step / 4) % track.chordFreqs.length;
      const currentChord = track.chordFreqs[chordIdx];
      const masterVol = isMutedRef.current ? 0 : volumeRef.current;

      const noteTime = nextNoteTimeRef.current;

      if (masterVol > 0) {
        // 1. KICK DRUM (Steps 0, 4, 8, 12 - 4-on-the-floor energy)
        if (step % 4 === 0) {
          const kickOsc = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kickOsc.frequency.setValueAtTime(140, noteTime);
          kickOsc.frequency.exponentialRampToValueAtTime(38, noteTime + 0.08);

          kickGain.gain.setValueAtTime(masterVol * 0.7, noteTime);
          kickGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

          kickOsc.connect(kickGain);
          kickGain.connect(ctx.destination);
          kickOsc.start(noteTime);
          kickOsc.stop(noteTime + 0.13);
        }

        // 2. SNARE / CLAP (Steps 4 and 12)
        if (step === 4 || step === 12) {
          const noiseBuffer = createNoiseBuffer(ctx);
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 1000;

          const snareGain = ctx.createGain();
          snareGain.gain.setValueAtTime(masterVol * 0.3, noteTime);
          snareGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

          noise.connect(filter);
          filter.connect(snareGain);
          snareGain.connect(ctx.destination);
          noise.start(noteTime);
          noise.stop(noteTime + 0.13);
        }

        // 3. HI-HAT (Every 16th note offbeat)
        if (step % 2 === 1) {
          const noiseBuffer = createNoiseBuffer(ctx);
          const noise = ctx.createBufferSource();
          noise.buffer = noiseBuffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 5000;

          const hatGain = ctx.createGain();
          hatGain.gain.setValueAtTime(masterVol * 0.12, noteTime);
          hatGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.04);

          noise.connect(filter);
          filter.connect(hatGain);
          hatGain.connect(ctx.destination);
          noise.start(noteTime);
          noise.stop(noteTime + 0.05);
        }

        // 4. BASS SYNTH (Syncopated upbeat bassline)
        if (step % 2 === 0 || step === 3 || step === 7 || step === 11 || step === 15) {
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();
          const bassFilter = ctx.createBiquadFilter();

          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(track.bassFreqs[chordIdx], noteTime);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(600, noteTime);
          bassFilter.frequency.exponentialRampToValueAtTime(180, noteTime + 0.15);

          bassGain.gain.setValueAtTime(masterVol * 0.28, noteTime);
          bassGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.16);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(ctx.destination);
          bassOsc.start(noteTime);
          bassOsc.stop(noteTime + 0.17);
        }

        // 5. CHORD SYNTH STABS (Offbeats / Upbeats)
        if (step % 4 === 2 || step % 4 === 3) {
          currentChord.forEach((freq) => {
            const chordOsc = ctx.createOscillator();
            const chordGain = ctx.createGain();

            chordOsc.type = 'triangle';
            chordOsc.frequency.setValueAtTime(freq, noteTime);

            chordGain.gain.setValueAtTime(masterVol * 0.08, noteTime);
            chordGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

            chordOsc.connect(chordGain);
            chordGain.connect(ctx.destination);
            chordOsc.start(noteTime);
            chordOsc.stop(noteTime + 0.2);
          });
        }

        // 6. CATCHY LEAD MELODY (Bright synth bell top notes)
        if (step % 2 === 0) {
          const melIdx = track.melodyPattern[step] % currentChord.length;
          const leadFreq = currentChord[melIdx] * 2; // Octave higher

          const leadOsc = ctx.createOscillator();
          const leadGain = ctx.createGain();

          leadOsc.type = 'sine';
          leadOsc.frequency.setValueAtTime(leadFreq, noteTime);

          leadGain.gain.setValueAtTime(masterVol * 0.15, noteTime);
          leadGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

          leadOsc.connect(leadGain);
          leadGain.connect(ctx.destination);
          leadOsc.start(noteTime);
          leadOsc.stop(noteTime + 0.25);
        }
      }

      nextNoteTimeRef.current += stepDuration;
      stepRef.current += 1;
    }

    timerIdRef.current = window.setTimeout(scheduleNotes, 50);
  };

  const togglePlay = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isPlaying) {
      isPlayingRef.current = false;
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      setIsPlaying(false);
    } else {
      isPlayingRef.current = true;
      nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.1;
      stepRef.current = 0;
      scheduleNotes();
      setIsPlaying(true);
    }
  };

  const toggleStyle = () => {
    setActiveStyle((prev) => (prev + 1) % tracks.length);
  };

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 transition-all duration-300">
      <div className="bg-[#002045]/95 backdrop-blur-md border border-[#2dd4bf]/50 p-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 text-white">
        
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-[#2dd4bf] text-[#002045] shadow-lg shadow-[#2dd4bf]/40 scale-105 animate-pulse'
              : 'bg-[#142742] text-slate-300 hover:text-white border border-slate-700 hover:border-[#2dd4bf]'
          }`}
          title={isPlaying ? 'Pausar Música Motivadora' : 'Reproducir Música Motivadora'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Music Track Info */}
        <div className="hidden sm:flex flex-col min-w-[160px]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#2dd4bf] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Música Motivadora Libre</span>
          </div>
          <button
            onClick={toggleStyle}
            className="text-xs font-bold text-slate-100 hover:text-[#2dd4bf] truncate max-w-[170px] text-left flex items-center gap-1.5 transition-colors"
            title="Haz clic para cambiar de ritmo"
          >
            <Radio className="w-3 h-3 text-[#2dd4bf] shrink-0" />
            <span className="truncate">{tracks[activeStyle].name}</span>
          </button>
        </div>

        {/* Animated Equalizer Visualizer */}
        {isPlaying && (
          <div className="flex items-end gap-1 h-6 px-1.5 py-0.5 bg-[#081526] rounded-lg border border-slate-800">
            <span className="w-1 bg-[#2dd4bf] rounded-full animate-[bounce_0.6s_infinite_100ms] h-5"></span>
            <span className="w-1 bg-[#2dd4bf] rounded-full animate-[bounce_0.8s_infinite_200ms] h-6"></span>
            <span className="w-1 bg-[#2dd4bf] rounded-full animate-[bounce_0.5s_infinite_150ms] h-3"></span>
            <span className="w-1 bg-[#2dd4bf] rounded-full animate-[bounce_0.7s_infinite_300ms] h-5"></span>
          </div>
        )}

        {/* Volume & Style Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg hover:bg-[#142742] text-slate-400 hover:text-white transition-colors"
            title={isMuted ? "Activar Sonido" : "Silenciar"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#2dd4bf]" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

