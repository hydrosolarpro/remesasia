import React from 'react';
import { CorredorId } from '../data/corredores';

// Banderas dibujadas en SVG (los emoji de bandera no se ven en Windows).
export const FlagPeru: React.FC<{ className?: string }> = ({ className = 'h-4 w-6' }) => (
  <svg viewBox="0 0 30 20" className={`${className} rounded-[3px] shrink-0`} aria-label="Perú">
    <rect width="10" height="20" fill="#D91023" />
    <rect x="10" width="10" height="20" fill="#FFFFFF" />
    <rect x="20" width="10" height="20" fill="#D91023" />
  </svg>
);

export const FlagVenezuela: React.FC<{ className?: string }> = ({ className = 'h-4 w-6' }) => (
  <svg viewBox="0 0 30 20" className={`${className} rounded-[3px] shrink-0`} aria-label="Venezuela">
    <rect width="30" height="6.67" fill="#FFCC00" />
    <rect y="6.67" width="30" height="6.67" fill="#00247D" />
    <rect y="13.34" width="30" height="6.66" fill="#CF142B" />
    {[-8, -5.5, -3, 0, 3, 5.5, 8].map((dx) => (
      <circle key={dx} cx={15 + dx} cy="10" r="0.9" fill="#FFFFFF" />
    ))}
  </svg>
);

export const FlagColombia: React.FC<{ className?: string }> = ({ className = 'h-4 w-6' }) => (
  <svg viewBox="0 0 30 20" className={`${className} rounded-[3px] shrink-0`} aria-label="Colombia">
    <rect width="30" height="10" fill="#FCD116" />
    <rect y="10" width="30" height="5" fill="#003893" />
    <rect y="15" width="30" height="5" fill="#CE1126" />
  </svg>
);

export const FlagChile: React.FC<{ className?: string }> = ({ className = 'h-4 w-6' }) => (
  <svg viewBox="0 0 30 20" className={`${className} rounded-[3px] shrink-0`} aria-label="Chile">
    <rect width="30" height="10" fill="#FFFFFF" />
    <rect y="10" width="30" height="10" fill="#D52B1E" />
    <rect width="10" height="10" fill="#0039A6" />
    <circle cx="5" cy="5" r="2.2" fill="#FFFFFF" />
  </svg>
);

export const FlagOtro: React.FC<{ className?: string }> = ({ className = 'h-4 w-6' }) => (
  <svg viewBox="0 0 30 20" className={`${className} shrink-0`} aria-label="Otro país">
    <circle cx="15" cy="10" r="9" fill="#2563EB" />
    <circle cx="15" cy="10" r="9" fill="none" stroke="#FFFFFF" strokeWidth="1" />
    <rect x="6" y="9.5" width="18" height="1" fill="#FFFFFF" />
    <rect x="14.5" y="1" width="1" height="18" fill="#FFFFFF" />
  </svg>
);

/** Bandera del país de recepción de un corredor. */
export const FlagCorredor: React.FC<{ id: CorredorId; className?: string }> = ({ id, className }) => {
  if (id === 'CO-VE') return <FlagColombia className={className} />;
  if (id === 'CL-VE') return <FlagChile className={className} />;
  if (id === 'OT-VE') return <FlagOtro className={className} />;
  return <FlagPeru className={className} />;
};
