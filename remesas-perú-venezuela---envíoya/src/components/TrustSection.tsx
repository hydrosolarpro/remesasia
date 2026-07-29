import React, { useState } from 'react';
import { ShieldCheck, Lock, Play, CheckCircle2, Award, Users, HeartHandshake, X } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <section id="respaldo" className="bg-[#eff4ff] text-[#0b1c30] py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-3xl bg-white p-8 sm:p-12 lg:p-16 border border-slate-200/80 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column Text */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a365d] text-white text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#2dd4bf]" />
              SEGURIDAD Y REGULACIÓN
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#002045] font-montserrat tracking-tight">
              Respaldo real y transparencia total
            </h2>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              No somos solo una app, somos un equipo comprometido con tu esfuerzo. Cada transacción está respaldada por procesos financieros seguros y una tasa de cambio justa, visible desde el primer segundo.
            </p>

            {/* Checkmark Badges */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-base font-bold text-[#002045]">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Regulado por SBS (Superintendencia de Banca y Seguros de Perú)</span>
              </div>

              <div className="flex items-center gap-3 text-base font-bold text-[#002045]">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-emerald-600" />
                </div>
                <span>Datos encriptados con seguridad bancaria de 256 bits</span>
              </div>
            </div>

            {/* Trust Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 text-center sm:text-left">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#002045] font-montserrat">
                  +120k
                </div>
                <div className="text-xs text-slate-500 font-medium">Envios procesados</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#002045] font-montserrat">
                  99.8%
                </div>
                <div className="text-xs text-slate-500 font-medium font-inter">Avisos automáticos</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#002045] font-montserrat">
                  4.9★
                </div>
                <div className="text-xs text-slate-500 font-medium">Calificación usuarios</div>
              </div>
            </div>

          </div>

          {/* Right Column Video Preview Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md group cursor-pointer" onClick={() => setVideoModalOpen(true)}>
              
              {/* Card Container */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 group-hover:scale-[1.02] transition-transform duration-300">
                <img
                  src="https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800"
                  alt="Familia sonriente recibiendo remesa"
                  className="w-full h-72 sm:h-80 object-cover opacity-80 group-hover:opacity-90 transition-opacity"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-6 text-white">
                  
                  <div className="self-end">
                    <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
                      HISTORIAS DE PAZ MENTAL
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="self-center my-auto">
                    <div className="w-16 h-16 rounded-full bg-[#2dd4bf] text-[#002045] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-lg font-montserrat">
                      "Ya no vivo preocupada esperando si llegó el dinero"
                    </h3>
                    <p className="text-xs text-slate-300 font-normal">
                      Ver cómo funciona el aviso instantáneo por Telegram para familias en Venezuela
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#002045] p-6 text-white border border-[#1a365d]">
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#142742] text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <h3 className="text-xl font-bold font-montserrat text-[#2dd4bf]">
                Demostración de Notificación Instantánea
              </h3>
              <p className="text-sm text-slate-300">
                Así es como el bot oficial de Telegram entrega la confirmación al celular de tu familiar en cuanto el Pago Móvil es procesado.
              </p>

              <div className="aspect-video bg-[#0b1c30] rounded-xl flex flex-col items-center justify-center p-6 border border-[#1a365d] text-center space-y-4">
                <div className="p-4 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30">
                  <Play className="w-10 h-10 fill-current" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Video de Testimonial Real</h4>
                  <p className="text-xs text-slate-400">
                    "Envié Soles desde Lima y en 4 minutos mi mamá en Valencia recibió el aviso oficial en su Telegram con la referencia del Pago Móvil."
                  </p>
                </div>
                <button
                  onClick={() => setVideoModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#2dd4bf] text-[#002045] font-bold text-xs"
                >
                  Cerrar Vista Previa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
