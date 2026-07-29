import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CLIENT_APP_LINK } from '../data/appData';

export const CallToAction: React.FC = () => {
  return (
    <section className="bg-[#0b1c30] py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-[#1a365d]">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#006b5f] via-[#005047] to-[#003630] p-8 sm:p-12 text-center text-white shadow-2xl overflow-hidden border border-[#2dd4bf]/30">
          
          {/* Subtle background blur circle */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2dd4bf]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            
            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-montserrat tracking-tight leading-tight">
              Envía tu remesa con total tranquilidad
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-emerald-100 font-medium leading-relaxed">
              Únete a las familias que ya no pierden el tiempo esperando una confirmación manual.
            </p>

            {/* CTA Button */}
            <div className="pt-2 flex flex-col items-center gap-3">
              <a
                href={CLIENT_APP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[#2dd4bf] text-[#002045] hover:bg-[#22b8a3] font-black text-lg uppercase tracking-wider shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.03] active:scale-[0.98]"
              >
                Accede YA
                <ArrowRight className="w-5 h-5" />
              </a>

              <span className="text-xs text-emerald-200/90 font-medium">
                Soles a Bolívares soberanos
              </span>
            </div>

            {/* Small reassurance */}
            <div className="pt-4 flex items-center justify-center gap-2 text-xs text-emerald-200/80">
              <ShieldCheck className="w-4 h-4 text-[#2dd4bf]" />
              <span>Plataforma digital 100 % gratuita, automática y confiable</span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
