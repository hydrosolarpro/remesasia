import React from 'react';
import { Frown, ShieldCheck, Clock, CheckCircle } from 'lucide-react';

export const ProblemCard: React.FC = () => {
  return (
    <section className="bg-[#0b1c30] py-10 px-4 sm:px-6 lg:px-8 border-t border-b border-[#1a365d]/50">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#142742] via-[#0f2139] to-[#0b1c30] p-6 sm:p-10 border border-slate-700/60 shadow-2xl text-center overflow-hidden">
          
          {/* Subtle accent glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#2dd4bf]/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 space-y-4">
            
            {/* Sad Face Red/Rose Icon Badge */}
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-2">
              <Frown className="w-8 h-8 stroke-[1.75]" />
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-montserrat tracking-tight">
              La incertidumbre es cosa del pasado
            </h2>

            {/* Body */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              Ya no más mensajes de WhatsApp sin respuesta ni horas de espera preguntando{' '}
              <span className="text-rose-300 font-semibold italic">"¿Ya te llegó?"</span>. Nuestra plataforma automatiza la comunicación para que tú y tu familia tengan paz mental total.
            </p>

            {/* Quick Benefits Pills */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-slate-300 font-medium">
              <span className="px-3 py-1.5 rounded-lg bg-[#002045] border border-slate-700 text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#2dd4bf]" /> Sin horas de angustia
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#002045] border border-slate-700 text-slate-200 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Confirmación automática en minutos
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#002045] border border-slate-700 text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-400" /> Tasa actual del día
              </span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
