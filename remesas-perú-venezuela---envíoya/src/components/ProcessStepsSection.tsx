import React from 'react';
import { ClipboardList, CreditCard, ReceiptText, Send, Check } from 'lucide-react';

export const ProcessStepsSection: React.FC = () => {
  const steps = [
    {
      number: '1',
      title: 'Solicita tu Envío',
      description: 'Ingresa el monto en Soles a Bolívares soberanos con la tasa actual del día.',
      icon: <ClipboardList className="w-6 h-6 text-[#2dd4bf]" />,
    },
    {
      number: '2',
      title: 'Paga en Perú',
      description: 'Usa Yape, Plin o transferencia bancaria local de forma segura.',
      icon: <CreditCard className="w-6 h-6 text-[#2dd4bf]" />,
    },
    {
      number: '3',
      title: 'Confirmación',
      description: 'Recibe tu comprobante digital al instante en tu celular.',
      icon: <ReceiptText className="w-6 h-6 text-[#2dd4bf]" />,
    },
    {
      number: '4',
      title: 'Aviso Final',
      description: '¡Listo! Tu familiar recibe la notificación automática de inmediato.',
      icon: <Send className="w-6 h-6 text-[#2dd4bf]" />,
    },
  ];

  return (
    <section id="proceso" className="bg-[#002045] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1a365d]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-montserrat tracking-tight">
            El proceso más sencillo del mercado
          </h2>
          <p className="text-base sm:text-lg text-slate-300 font-medium">
            Pensado en la automatización para que pueda usarlo sin complicaciones
          </p>
        </div>

        {/* 4 Steps Column / Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="relative rounded-2xl bg-[#0b1c30] p-6 border border-[#1a365d] hover:border-[#2dd4bf]/50 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-4">
                
                {/* Step Number Badge */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-full bg-[#2dd4bf] text-[#002045] font-black text-xl font-montserrat flex items-center justify-center shadow-lg shadow-[#2dd4bf]/20 group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                  <div className="p-2 rounded-xl bg-[#142742]">
                    {step.icon}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold font-montserrat text-white">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-slate-300 text-sm leading-relaxed font-normal">
                  {step.description}
                </p>

              </div>

              {/* Connecting arrow indicator on desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-[#142742] text-[#2dd4bf] border border-[#2dd4bf]/30">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

        </div>

      </div>
    </section>
  );
};
