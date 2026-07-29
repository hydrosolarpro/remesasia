import React from 'react';
import { Send, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CLIENT_APP_LINK } from '../data/appData';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#002045] via-[#0b1c30] to-[#0b1c30] pt-8 pb-16 lg:pt-16 lg:pb-24">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#2dd4bf]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text & Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Instant Confirmation Pill */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2dd4bf] text-[#002045] font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-[#2dd4bf]/25 animate-pulse">
                <Zap className="w-3.5 h-3.5 fill-current" />
                CONFIRMACIÓN INSTANTÁNEA
              </div>
            </div>

            {/* PE -> VE Indicator */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-slate-300 font-semibold text-sm">
              <span className="text-slate-400 font-normal">Soles a Bolívares soberanos | Transparencia Garantizada</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight font-montserrat">
              Remesas <span className="text-white">PERÚ-VENEZUELA</span> y entérate al{' '}
              <span className="text-[#2dd4bf] underline decoration-[#2dd4bf]/40 underline-offset-8">
                instante
              </span>
            </h1>

            {/* Body Copy */}
            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Confirmación automática para ti y tu familia. Sin tener que preguntar, sin esperar respuesta por WhatsApp. Tus seres queridos son avisados en el momento exacto.
            </p>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <a
                href={CLIENT_APP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-4.5 rounded-xl bg-[#2dd4bf] hover:bg-[#22b8a3] text-[#002045] font-black text-base uppercase tracking-wider shadow-xl shadow-[#2dd4bf]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                Accede YA
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Small trust features */}
            <div className="grid grid-cols-2 gap-3 pt-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />
                <span>Pago Móvil al instante</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center lg:justify-start">
                <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />
                <span>Sin comisiones ocultas</span>
              </div>
            </div>

          </div>

          {/* Right Column: Realistic Phone Graphic with Notification */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[340px] sm:max-w-[380px]">
              
              {/* Outer decorative gradient frame */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#2dd4bf] to-sky-500 rounded-[48px] blur-xl opacity-30 animate-pulse"></div>

              {/* Realistic Modern Phone Frame */}
              <div className="relative rounded-[44px] bg-[#001024] p-3 shadow-2xl border-4 border-slate-800">
                
                {/* Dynamic Island / Notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-end pr-2">
                  <div className="w-2 h-2 rounded-full bg-[#142742]"></div>
                </div>

                {/* Phone Screen Display */}
                <div className="relative rounded-[36px] overflow-hidden bg-gradient-to-b from-[#1a365d] via-[#0e2a4a] to-[#07182b] aspect-[9/18] flex flex-col justify-between p-5 text-white shadow-inner">
                  
                  {/* Top Status Bar */}
                  <div className="flex justify-between items-center text-[10px] text-slate-300 pt-1 font-medium z-20">
                    <span>09:41</span>
                    <div className="flex items-center gap-1.5">
                      <span>5G</span>
                      <div className="w-4 h-2 border border-slate-300 rounded-sm p-0.5">
                        <div className="w-full h-full bg-emerald-400"></div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Screen Wallpaper & Header Graphic */}
                  <div className="my-auto space-y-6 text-center z-10 py-4">
                    <div className="inline-flex p-3 rounded-2xl bg-[#002045]/80 border border-[#2dd4bf]/30 backdrop-blur-md shadow-xl">
                      <Send className="w-8 h-8 text-[#2dd4bf]" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] tracking-widest text-[#2dd4bf] font-bold uppercase">
                        SISTEMA EN VIVO
                      </span>
                      <p className="text-xl font-bold font-montserrat">Remesas PERÚ-VENEZUELA</p>
                      <p className="text-xs text-slate-300">Tasa actual del día</p>
                    </div>

                    {/* Notification Floating Popup Banner */}
                    <div className="relative text-left">
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0d3b66] to-[#0a2540] border border-sky-400/50 shadow-2xl backdrop-blur-md relative overflow-hidden">
                        
                        {/* Shimmer effect */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-400/10 rounded-full blur-xl pointer-events-none"></div>

                        <div className="flex items-start gap-3">
                          {/* Icon Circle */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2dd4bf] to-emerald-400 flex items-center justify-center shrink-0 shadow-md">
                            <Send className="w-5 h-5 text-[#002045] fill-current -ml-0.5" />
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-bold text-white font-montserrat leading-tight">
                                ¡Transferencia recibida!
                              </h4>
                              <span className="text-[9px] text-sky-300 font-mono">Ahora</span>
                            </div>
                            <p className="text-[11px] text-slate-200 leading-snug font-normal">
                              Tu familiar ya cuenta con el dinero en bolívares soberanos.
                            </p>
                            <div className="pt-1 flex items-center gap-2 text-[9px] text-emerald-400 font-semibold">
                              <span>Ref: #PEVE-9842</span>
                              <span>•</span>
                              <span>Monto Procesado</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Phone Bottom Navigation Bar */}
                  <div className="w-28 h-1 bg-slate-400/50 rounded-full mx-auto mb-1"></div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
