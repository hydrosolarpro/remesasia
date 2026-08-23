import React from 'react';
import { motion } from 'motion/react';
import { PlayCircle, Zap, ShieldCheck, RefreshCw, Headphones, Sparkles } from 'lucide-react';

interface VideoPromocionalProps {
  onOpenDemoModal: () => void;
}

// Archivo servido como estático desde public/videos/ (Vite lo copia tal
// cual al build, sin procesar) -- si en el futuro se prefiere alojarlo en
// YouTube/Vimeo, basta con pegar acá esa URL de embed en vez de la ruta
// local; el render de abajo detecta la extensión para decidir si usa
// <video> nativo o <iframe>. Vacío = placeholder "video próximamente".
const URL_VIDEO_PROMOCIONAL = '/videos/video-promocional.mp4';
const ES_ARCHIVO_DE_VIDEO = /\.(mp4|webm|mov)$/i.test(URL_VIDEO_PROMOCIONAL);

const BENEFICIOS = [
  { icon: Zap, texto: 'Automatiza cobros, validaciones y avisos por WhatsApp y Telegram' },
  { icon: RefreshCw, texto: 'Sincronización instantánea entre tu equipo en Perú y en Venezuela' },
  { icon: ShieldCheck, texto: 'Respaldo de base de datos y seguridad cibernética incluidos' },
  { icon: Headphones, texto: 'Soporte técnico y asesorías en línea 24/7 sin costo adicional' },
];

export const VideoPromocional: React.FC<VideoPromocionalProps> = ({ onOpenDemoModal }) => {
  return (
    <section id="video" className="py-24 px-4 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider shadow-lg shadow-blue-500/10">
            <PlayCircle className="w-4 h-4 text-blue-400" />
            <span>Conócela en 5 minutos</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-wide">
            Mira Cómo <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Funciona</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Un recorrido rápido por la plataforma: cómo automatiza tu negocio de remesas de principio a fin, y por qué operadores en Perú y Venezuela ya confían en ella.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl overflow-hidden"
        >
          <div className="aspect-video w-full relative">
            {URL_VIDEO_PROMOCIONAL && ES_ARCHIVO_DE_VIDEO ? (
              <video src={URL_VIDEO_PROMOCIONAL} className="w-full h-full bg-black" controls playsInline preload="metadata" />
            ) : URL_VIDEO_PROMOCIONAL ? (
              <iframe
                src={URL_VIDEO_PROMOCIONAL}
                title="Video promocional Remesas Perú-Venezuela"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={onOpenDemoModal}
                className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 cursor-pointer group"
              >
                <PlayCircle className="w-16 h-16 text-blue-400 group-hover:scale-110 group-hover:text-blue-300 transition-all duration-300" />
                <span className="text-slate-300 font-mono text-xs uppercase tracking-widest font-bold">Video promocional próximamente</span>
                <span className="text-blue-400 font-mono text-xs uppercase tracking-widest font-bold underline underline-offset-4">Mientras tanto, solicita tu demo en vivo</span>
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFICIOS.map(({ icon: Icon, texto }, idx) => (
            <motion.div
              key={texto}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-slate-300 text-sm leading-snug">{texto}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
