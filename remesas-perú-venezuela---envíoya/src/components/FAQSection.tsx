import React, { useState } from 'react';
import { FAQ_DATA } from '../data/appData';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';

interface FAQSectionProps {
  onOpenWhatsAppSupport: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onOpenWhatsAppSupport }) => {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="bg-[#f8f9ff] text-[#0b1c30] py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a365d]/10 text-[#002045] text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-[#006b5f]" />
            RESPUESTAS CLARAS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#002045] font-montserrat tracking-tight">
            Dudas frecuentes
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Todo lo que necesitas saber antes de realizar tu envío.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQ_DATA.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none hover:bg-slate-50/80 transition-colors"
                >
                  <span className="text-lg font-bold text-[#002045] font-montserrat leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-[#62fae3]/30 text-[#006b5f]' : 'text-slate-500'
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 leading-relaxed text-base border-t border-slate-100">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
