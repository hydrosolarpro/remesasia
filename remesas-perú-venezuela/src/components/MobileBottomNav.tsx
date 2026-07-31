import React from 'react';
import { Home, TrendingUp, Receipt, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] font-mono pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-2">
        <a
          href="#"
          className="flex flex-col items-center justify-center text-blue-400 font-bold text-[10px] space-y-1 active:scale-95 transition-transform p-1"
        >
          <Home className="w-5 h-5" />
          <span className="uppercase tracking-wider">Inicio</span>
        </a>

        <a
          href="#simulator"
          className="flex flex-col items-center justify-center text-slate-400 hover:text-white font-bold text-[10px] space-y-1 transition-colors active:scale-95 p-1"
        >
          <TrendingUp className="w-5 h-5" />
          <span className="uppercase tracking-wider">Tasas</span>
        </a>

        <a
          href="#carousel"
          className="flex flex-col items-center justify-center text-slate-400 hover:text-white font-bold text-[10px] space-y-1 transition-colors active:scale-95 p-1"
        >
          <Receipt className="w-5 h-5" />
          <span className="uppercase tracking-wider">Fotos</span>
        </a>

        <a
          href="#founder"
          className="flex flex-col items-center justify-center text-slate-400 hover:text-white font-bold text-[10px] space-y-1 transition-colors active:scale-95 p-1"
        >
          <User className="w-5 h-5" />
          <span className="uppercase tracking-wider">Fundador</span>
        </a>
      </div>
    </nav>
  );
};
