import React, { useState, useEffect } from 'react';
import { Currency, MessageCircle, Smartphone, Menu, X } from 'lucide-react';
import flagsImg from '../assets/images/peru_venezuela_flags_1785374379770.jpg';
import logoImg from '../assets/images/logo-remesas.png';

interface HeaderProps {
  onOpenDemoModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDemoModal }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-2xl py-2.5'
          : 'bg-slate-950/50 backdrop-blur-md py-3.5 border-b border-slate-800/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Flags Image */}
        <div className="flex items-center gap-2.5 sm:gap-5 min-w-0">
          <a href="#" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform drop-shadow-[0_0_10px_rgba(59,130,246,0.45)]">
              <img src={logoImg} alt="Remesas Perú-Venezuela" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-xs sm:text-base text-white tracking-tight uppercase leading-tight truncate">
                REMESAS <span className="text-blue-500">PERÚ - VENEZUELA</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono tracking-wider uppercase flex items-center gap-1 mt-0.5 truncate">
                <span>PERÚ 🇵🇪</span>
                <span className="text-blue-400">↔</span>
                <span>VENEZUELA 🇻🇪</span>
              </span>
            </div>
          </a>

          {/* Peru & Venezuela Flags Banner Image in Header */}
          <div className="hidden md:flex items-center h-9 rounded-lg overflow-hidden border border-slate-800 shadow-md bg-slate-900 px-1 hover:scale-105 transition-transform">
            <img
              src={flagsImg}
              alt="Banderas Perú y Venezuela"
              className="h-7 w-auto object-contain rounded"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          <a href="#simulator" className="hover:text-white transition-colors">
            Calculadora
          </a>
          <a href="#carousel" className="hover:text-white transition-colors">
            Plataforma
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Beneficios
          </a>
          <a href="#comparison" className="hover:text-white transition-colors">
            Comparativa
          </a>
          <a href="#plans" className="hover:text-white transition-colors">
            Planes
          </a>
          <a href="#founder" className="hover:text-white transition-colors">
            Fundador
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href={`https://wa.me/51960442025?text=${encodeURIComponent("Hola!, deseo ingresar a la Plaforma Remesas PERÚ-VENEZUELA  con la prueba gratuita por 7 días.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 hover:text-white transition-all cursor-pointer"
            title="Chat en WhatsApp (+51 960 442 025)"
          >
            <MessageCircle className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onOpenDemoModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-blue-400/30"
          >
            <Smartphone className="w-4 h-4" />
            <span>SOLICITA DEMO GRATIS (7 DÍAS)</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800 px-6 py-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-300 font-mono font-bold uppercase">REMESAS PERÚ - VENEZUELA</span>
            <img
              src={flagsImg}
              alt="Banderas Perú y Venezuela"
              className="h-6 w-auto object-contain rounded"
              referrerPolicy="no-referrer"
            />
          </div>

          <nav className="flex flex-col space-y-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">
            <a
              href="#simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:text-blue-400 transition-colors"
            >
              Calculadora de Conversión
            </a>
            <a
              href="#carousel"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:text-blue-400 transition-colors"
            >
              Fotos de la Plataforma
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:text-blue-400 transition-colors"
            >
              Beneficios
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:text-blue-400 transition-colors"
            >
              Caos vs Eficiencia
            </a>
            <a
              href="#plans"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:text-blue-400 transition-colors"
            >
              Planes de Suscripción
            </a>
            <a
              href="#founder"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:text-blue-400 transition-colors"
            >
              Fundador & Visión
            </a>
          </nav>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemoModal();
              }}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider text-center shadow-lg shadow-blue-500/25 block cursor-pointer"
            >
              📱 SOLICITA DEMO GRATIS (7 DÍAS)
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
