import React, { useState } from 'react';
import { ArrowRightLeft, Menu, X, Send } from 'lucide-react';
import { PeruFlag, VenezuelaFlag, PeruVenezuelaBannerFlags } from './CountryFlags';
import { CLIENT_APP_LINK } from '../data/appData';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#002045]/95 backdrop-blur-md border-b border-[#1a365d] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2dd4bf] to-[#006b5f] flex items-center justify-center text-[#002045] font-black text-xl shadow-lg shadow-[#2dd4bf]/20 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5 text-[#002045] fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-white leading-tight font-montserrat flex items-center gap-1.5">
                  Remesas <span className="text-[#2dd4bf]">PERÚ-VENEZUELA</span>
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#2dd4bf] font-bold tracking-wider uppercase">
                  PLATAFORMA DIGITAL CON ACCESO GRATUITO
                </span>
              </div>
            </a>

            {/* Country Flags Badge */}
            <div className="hidden md:flex items-center ml-2">
              <PeruVenezuelaBannerFlags size="sm" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-200">
            <a href="#diferentes" className="hover:text-[#2dd4bf] transition-colors">
              ¿Por qué somos diferentes?
            </a>
            <a href="#proceso" className="hover:text-[#2dd4bf] transition-colors">
              El Proceso
            </a>
            <a href="#faq" className="hover:text-[#2dd4bf] transition-colors">
              Dudas
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href={CLIENT_APP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-lg bg-[#2dd4bf] hover:bg-[#22b8a3] text-[#002045] font-black text-xs uppercase tracking-wider shadow-md shadow-[#2dd4bf]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Accede YA
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-1">
              <PeruFlag className="w-5 h-3.5" />
              <VenezuelaFlag className="w-5 h-3.5" />
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menú"
              className="p-2 rounded-lg bg-[#142742] text-slate-200 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#002045] border-b border-[#1a365d] px-4 pt-3 pb-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1a365d]/60">
            <span className="text-xs font-bold text-[#2dd4bf] uppercase tracking-wider">
              Menú Principal
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Tasa actual del día
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm font-medium">
            <a
              href="#diferentes"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#142742] text-slate-200"
            >
              ✨ Por qué somos diferentes
            </a>
            <a
              href="#proceso"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#142742] text-slate-200"
            >
              ⚡ El Proceso en 4 Pasos
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#142742] text-slate-200"
            >
              ❓ Dudas Frecuentes
            </a>
          </div>

          <div className="pt-2">
            <a
              href={CLIENT_APP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 rounded-xl bg-[#2dd4bf] text-[#002045] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
            >
              Accede YA
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
