import React from 'react';
import { Send, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenWhatsAppSupport?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-[#001024] text-white pt-16 pb-12 border-t border-[#1a365d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#1a365d]">
          
          {/* Brand Info */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2dd4bf] to-[#006b5f] flex items-center justify-center text-[#002045] font-black">
                <Send className="w-5 h-5 text-[#002045] fill-current" />
              </div>
              <span className="font-extrabold text-xl tracking-tight font-montserrat">
                Remesas <span className="text-[#2dd4bf]">PERÚ-VENEZUELA</span>
              </span>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Tu puente de confianza entre Perú y Venezuela. Rápido, seguro y confiable.
            </p>

            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-[#002045] px-3 py-2 rounded-xl border border-emerald-500/30 w-fit">
              <ShieldCheck className="w-4 h-4 text-[#2dd4bf]" />
              <span>Plataforma digital 100 % gratuita, automática y confiable</span>
            </div>
          </div>

          {/* Navegación */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2dd4bf] font-montserrat">
              Navegación
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a href="#diferentes" className="hover:text-[#2dd4bf] transition-colors">
                  ¿Por qué somos diferentes?
                </a>
              </li>
              <li>
                <a href="#proceso" className="hover:text-[#2dd4bf] transition-colors">
                  El Proceso
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#2dd4bf] transition-colors">
                  Preguntas Frecuentes
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 text-center sm:text-left">
          <p>
            © 2024 Remesas PERÚ-VENEZUELA. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Privacidad</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
