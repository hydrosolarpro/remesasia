import React from 'react';
import { motion } from 'motion/react';
import { Check, Sparkles, ArrowRight, Smartphone, Zap } from 'lucide-react';
import { PLANES } from '../data/planes';

interface PricingSectionProps {
  onOpenDemoModal: () => void;
}

// Estilo visual por plan -- los números (precio/cupos) vienen de
// src/data/planes.ts (misma fuente que la calculadora) para que nunca se
// desalineen entre secciones de la landing.
const ESTILO_POR_PLAN: Record<
  string,
  {
    etiqueta: string;
    featured?: boolean;
    card: string;
    badge: string;
    titulo: string;
    check: string;
    boton: string;
  }
> = {
  starter: {
    etiqueta: 'Básico',
    card: 'bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700',
    badge: 'text-slate-400 bg-slate-800/60',
    titulo: 'text-white',
    check: 'text-emerald-400',
    boton: 'border border-slate-700 text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-500',
  },
  pro: {
    etiqueta: 'Recomendado',
    featured: true,
    card: 'bg-gradient-to-b from-blue-950/60 via-slate-900 to-slate-950 border-2 border-blue-500 shadow-2xl shadow-blue-500/25',
    badge: 'text-blue-400 bg-blue-500/20 border border-blue-500/30',
    titulo: 'text-white',
    check: 'text-blue-400',
    boton: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-xl shadow-blue-500/30',
  },
  expert: {
    etiqueta: 'Avanzado',
    card: 'bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/40 hover:border-amber-500/70 shadow-lg shadow-amber-950/20',
    badge: 'text-amber-400 bg-amber-500/20 border border-amber-500/30',
    titulo: 'text-amber-300',
    check: 'text-amber-400',
    boton: 'border border-amber-500/50 text-amber-200 hover:bg-amber-600 hover:text-white',
  },
  avance: {
    etiqueta: 'Escalable',
    card: 'bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700',
    badge: 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30',
    titulo: 'text-white',
    check: 'text-emerald-400',
    boton: 'border border-slate-700 text-slate-200 hover:bg-slate-800',
  },
  ultra: {
    etiqueta: 'Corporativo',
    card: 'bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 hover:border-purple-500/70 shadow-lg shadow-purple-950/20',
    badge: 'text-purple-400 bg-purple-500/20 border border-purple-500/30',
    titulo: 'text-purple-400',
    check: 'text-purple-400',
    boton: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25',
  },
};

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

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="inline-flex flex-wrap items-center justify-center gap-2.5 px-5 sm:px-7 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-2xl shadow-emerald-500/40 border border-emerald-300/50 animate-pulse-glow"
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
            <span className="text-white font-mono font-black uppercase tracking-wide text-sm sm:text-lg">
              Costo por cliente:
            </span>
            <span className="text-white font-mono font-black text-2xl sm:text-3xl leading-none">
              S/ 1<span className="text-sm sm:text-lg font-bold">/mes</span>
            </span>
            <span className="text-emerald-950 bg-white/90 font-mono font-extrabold text-[11px] sm:text-xs uppercase tracking-wider px-2.5 py-1 rounded-full">
              En cualquiera de los planes
            </span>
          </motion.div>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-stretch">
          {PLANES.map((plan, idx) => {
            const estilo = ESTILO_POR_PLAN[plan.id];
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -8, scale: estilo.featured ? 1.02 : 1 }}
                className={`p-6 rounded-2xl transition-all duration-300 flex flex-col justify-between space-y-6 shadow-xl hover:shadow-2xl relative group overflow-hidden shimmer-effect card-beam-highlight info-card-interactive ${estilo.card}`}
              >
                {estilo.featured && (
                  <div className="absolute -top-3.5 right-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-3 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest shadow-lg shadow-blue-500/40 animate-pulse">
                    POPULAR
                  </div>
                )}

                <div className="space-y-4">
                  <span className={`text-xs font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${estilo.badge}`}>{estilo.etiqueta}</span>
                  <h3 className={`text-xl font-black font-mono uppercase tracking-wider ${estilo.titulo}`}>{plan.nombre}</h3>
                  <div className="text-3xl font-extrabold font-mono text-white my-4">
                    S/ {plan.precio} <span className="text-xs font-normal text-slate-400">/mes</span>
                  </div>
                  <ul className="space-y-3 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${estilo.check}`} />
                      <span>Registro hasta {plan.clientes} clientes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${estilo.check}`} />
                      <span>{plan.operadoresPeru} Operadores en Perú</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${estilo.check}`} />
                      <span>{plan.operadoresVenezuela} Operadores en Venezuela</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${estilo.check}`} />
                      <span>Y otras funcionalidades automáticas</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={onOpenDemoModal}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer font-mono text-center block shadow-md group-hover:scale-[1.02] ${estilo.boton}`}
                >
                  SOLICITA TU PLAN
                </button>
              </motion.div>
            );
          })}
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

