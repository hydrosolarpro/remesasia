import React from 'react';
import { motion } from 'motion/react';
import { Quote, ShieldCheck, Lock, Sparkles, Award } from 'lucide-react';
import joseSilvaImg from '../assets/images/jose_silva_fundador.jpeg';

export const FounderSection: React.FC = () => {
  return (
    <section id="founder" className="py-24 px-4 bg-slate-950 relative border-t border-slate-800/80 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
        {/* Profile Avatar / Portrait with animated glowing aura */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative w-44 h-44 mx-auto group"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 via-cyan-400 to-emerald-400 blur-md animate-pulse-glow group-hover:scale-110 transition-transform duration-500" />
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-blue-400/80 shadow-2xl p-1.5 bg-slate-950">
            <img
              src={joseSilvaImg}
              alt="José Alfredo Silva - Founder & Visionary"
              className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute bottom-1 right-1 bg-gradient-to-r from-blue-600 to-cyan-500 p-2 rounded-full border border-slate-900 text-white shadow-lg shadow-blue-500/40">
            <Award className="w-4 h-4" />
          </div>
        </motion.div>

        {/* Founder Titles */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-1"
        >
          <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            José Alfredo Silva
          </h3>
          <p className="text-xs sm:text-sm font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Founder & Visionary</span>
          </p>
        </motion.div>

        {/* Quote Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative max-w-2xl mx-auto p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 space-y-4 shadow-2xl backdrop-blur-md glow-card-blue shimmer-effect card-beam-highlight info-card-interactive"
        >
          <Quote className="w-10 h-10 text-blue-400/50 mx-auto animate-pulse" />
          <p className="text-base sm:text-xl text-slate-200 italic leading-relaxed font-serif">
            "Nuestra misión es empoderar a cada remesero con las herramientas de automatización para el crecimiento de su negocio de remesas."
          </p>
        </motion.div>

        {/* Security Seals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-4 font-mono"
        >
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-200 shadow-lg hover:border-emerald-500/40 transition-colors">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Respaldo de Base de Datos</span>
          </div>
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-200 shadow-lg hover:border-blue-500/40 transition-colors">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Seguridad Digital & Protección</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

