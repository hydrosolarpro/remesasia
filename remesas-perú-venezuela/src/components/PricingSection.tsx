import React from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles, ArrowRight, Smartphone, Zap } from 'lucide-react';

interface PricingSectionProps {
  onOpenDemoModal: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenDemoModal }) => {

  return (
    <section id="plans" className="py-24 px-4 bg-slate-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider shadow-lg shadow-blue-500/10">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Suscripción Transparente</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-wide">
            Escoge Tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Plan</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Elige el nivel de capacidad ideal para el volumen de tus operadores. Puedes iniciar con 7 días gratis sin compromisos.
          </p>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {/* Plan STARTER */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ y: -8 }}
            className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl hover:shadow-2xl relative group overflow-hidden shimmer-effect card-beam-highlight info-card-interactive"
          >
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-800/60 px-2.5 py-1 rounded-md">Básico</span>
              <h3 className="text-xl font-black font-mono text-white uppercase tracking-wider">STARTER</h3>
              <div className="text-3xl font-extrabold font-mono text-white my-4">
                S/ 100 <span className="text-xs font-normal text-slate-400">/mes</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Registro hasta 100 clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>2 Operadores en Perú</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>2 Operadores en Venezuela</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Y otras funcionalidades automáticas</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="w-full py-3 rounded-xl border border-slate-700 text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500 font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer font-mono text-center block shadow-md group-hover:scale-[1.02]"
            >
              SOLICITA TU PLAN
            </button>
          </motion.div>

          {/* Plan PRO (Featured) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="p-6 rounded-2xl bg-gradient-to-b from-blue-950/60 via-slate-900 to-slate-950 border-2 border-blue-500 shadow-2xl shadow-blue-500/25 relative flex flex-col justify-between space-y-6 group overflow-hidden shimmer-effect card-beam-highlight info-card-interactive"
          >
            <div className="absolute -top-3.5 right-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-3 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest shadow-lg shadow-blue-500/40 animate-pulse">
              POPULAR
            </div>

            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-md">Recomendado</span>
              <h3 className="text-xl font-black font-mono text-white uppercase tracking-wider">PRO</h3>
              <div className="text-3xl font-extrabold font-mono text-white my-4">
                S/ 200 <span className="text-xs font-normal text-slate-400">/mes</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Registro hasta 200 clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>3 Operadores en Perú</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>3 Operadores en Venezuela</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Y otras funcionalidades automáticas</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onOpenDemoModal}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all duration-300 cursor-pointer font-mono text-center block group-hover:scale-[1.02]"
            >
              SOLICITA TU PLAN
            </button>
          </motion.div>

          {/* Plan AVANCE */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ y: -8 }}
            className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl hover:shadow-2xl relative group overflow-hidden shimmer-effect card-beam-highlight info-card-interactive"
          >
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-md">Escalable</span>
              <h3 className="text-xl font-black font-mono text-white uppercase tracking-wider">AVANCE</h3>
              <div className="text-3xl font-extrabold font-mono text-white my-4">
                S/ 300 <span className="text-xs font-normal text-slate-400">/mes</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Registro hasta 500 clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>4 Operadores en Perú</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>4 Operadores en Venezuela</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Y otras funcionalidades automáticas</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="w-full py-3 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer font-mono text-center block shadow-md group-hover:scale-[1.02]"
            >
              SOLICITA TU PLAN
            </button>
          </motion.div>

          {/* Plan ULTRA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            whileHover={{ y: -8 }}
            className="p-6 rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 hover:border-purple-500/70 transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl shadow-purple-950/20 relative group overflow-hidden shimmer-effect card-beam-highlight info-card-interactive"
          >
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-md">Corporativo</span>
              <h3 className="text-xl font-black font-mono text-purple-400 uppercase tracking-wider">ULTRA</h3>
              <div className="text-3xl font-extrabold font-mono text-white my-4">
                S/ 500 <span className="text-xs font-normal text-slate-400">/mes</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Registro hasta 1000 clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>8 Operadores en Perú</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>8 Operadores en Venezuela</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Y otras funcionalidades automáticas</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer font-mono shadow-lg shadow-purple-600/25 text-center block group-hover:scale-[1.02]"
            >
              SOLICITA TU PLAN
            </button>
          </motion.div>
        </div>

        {/* Free Trial Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/40 text-center space-y-6 max-w-4xl mx-auto shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Sin riesgo, Cancela cuando quieras</span>
          </div>

          <p className="text-base sm:text-xl font-black text-emerald-400 leading-relaxed font-mono max-w-2xl mx-auto">
            ¡Prueba gratuita por 7 días en el plan STARTER y revoluciona tu negocio en el camino de la automatización!
          </p>

          <div>
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="px-9 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/30 transition-all duration-300 inline-flex items-center gap-3 cursor-pointer font-mono hover:scale-105 active:scale-95 border border-blue-400/30"
            >
              <Smartphone className="w-5 h-5 animate-bounce" />
              <span>SOLICITA AQUÍ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

