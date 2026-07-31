import React from 'react';
import { MessageCircle, Mail, Clock, Shield, Currency } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 py-12 pb-28 lg:pb-12 border-t border-slate-800 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 space-y-8 text-center flex flex-col items-center">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Currency className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-left">
            <div className="font-black text-base text-white tracking-widest uppercase font-mono">
              REMESAS
            </div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">
              PERÚ-VENEZUELA · PLATAFORMA DIGITAL
            </div>
          </div>
        </div>

        {/* Contact info list */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-mono font-bold">
          <a
            href={`https://wa.me/51960442025?text=${encodeURIComponent("Hola!, deseo ingresar a la Plaforma Remesas PERÚ-VENEZUELA  con la prueba gratuita por 7 días.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-emerald-400 hover:text-white transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp: +51 960 442 025</span>
          </a>

          <span className="hidden sm:inline text-slate-700">•</span>

          <a
            href="mailto:remesasperuve@gmail.com"
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <Mail className="w-4 h-4 text-blue-400" />
            <span>remesasperuve@gmail.com</span>
          </a>

          <span className="hidden sm:inline text-slate-700">•</span>

          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Soporte Tecnológico 24/7</span>
          </div>
        </div>

        {/* Footer Nav */}
        <div className="flex flex-wrap justify-center gap-6 text-slate-400 font-mono text-xs">
          <a href="#simulator" className="hover:text-white transition-colors">Calculadora</a>
          <a href="#carousel" className="hover:text-white transition-colors">Fotos Plataforma</a>
          <a href="#features" className="hover:text-white transition-colors">Beneficios</a>
          <a href="#plans" className="hover:text-white transition-colors">Planes</a>
          <a href="#founder" className="hover:text-white transition-colors">Seguridad</a>
        </div>

        {/* Copyright */}
        <div className="pt-4 border-t border-slate-900 w-full">
          <p className="text-[10px] tracking-[0.2em] uppercase text-slate-600 font-mono font-bold">
            © 2026 REMESAS PERÚ-VENEZUELA. TODOS LOS DERECHOS RESERVADOS.
          </p>
        </div>
      </div>
    </footer>
  );
};
