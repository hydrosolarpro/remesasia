import React from 'react';
import { CORREDORES } from '../data/corredores';
import { useCorredorLanding } from '../lib/corredorContext';
import { FlagCorredor, FlagVenezuela } from './Flag';

// Selector de corredor de la landing: banderas de cada país de recepción y de
// Venezuela. Cambia la moneda, los medios de pago y los textos de la página.
export const CorredorTabs: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => {
  const { corredor, setCorredorId } = useCorredorLanding();
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="tablist" aria-label="Corredor de remesas">
      {CORREDORES.map((c) => {
        const activo = c.id === corredor.id;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => setCorredorId(c.id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activo
                ? 'bg-blue-600/25 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
            }`}
          >
            <FlagCorredor id={c.id} />
            <span>{compact ? c.pais : c.nombre}</span>
            {!compact && <FlagVenezuela />}
          </button>
        );
      })}
    </div>
  );
};
