import React from 'react';

export const PeruFlag: React.FC<{ className?: string }> = ({ className = "w-7 h-5" }) => (
  <svg viewBox="0 0 30 20" className={`rounded-[2px] shadow-sm inline-block overflow-hidden ${className}`}>
    <rect width="10" height="20" x="0" fill="#D91023" />
    <rect width="10" height="20" x="10" fill="#FFFFFF" />
    <rect width="10" height="20" x="20" fill="#D91023" />
    {/* Coat of arms shield in center */}
    <rect x="13.5" y="7.5" width="3" height="5" rx="0.5" fill="#D91023" stroke="#D4AF37" strokeWidth="0.4" />
  </svg>
);

export const VenezuelaFlag: React.FC<{ className?: string }> = ({ className = "w-7 h-5" }) => (
  <svg viewBox="0 0 30 20" className={`rounded-[2px] shadow-sm inline-block overflow-hidden ${className}`}>
    <rect width="30" height="6.67" y="0" fill="#FFCC00" />
    <rect width="30" height="6.67" y="6.67" fill="#00247D" />
    <rect width="30" height="6.67" y="13.33" fill="#CF142B" />
    {/* 8 white stars arc */}
    <g fill="#FFFFFF" transform="translate(15, 10) scale(0.65)">
      <circle cx="-6.5" cy="1.2" r="0.75" />
      <circle cx="-4.5" cy="-0.8" r="0.75" />
      <circle cx="-2.3" cy="-2.0" r="0.75" />
      <circle cx="0" cy="-2.4" r="0.75" />
      <circle cx="2.3" cy="-2.0" r="0.75" />
      <circle cx="4.5" cy="-0.8" r="0.75" />
      <circle cx="6.5" cy="1.2" r="0.75" />
      <circle cx="0" cy="-0.2" r="0.6" />
    </g>
  </svg>
);

export const PeruVenezuelaBannerFlags: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const flagStyle = size === 'sm' ? 'w-6 h-4' : size === 'lg' ? 'w-10 h-7' : 'w-8 h-5.5';

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#142742] border border-[#2dd4bf]/40 shadow-md backdrop-blur-sm">
      <div className="flex items-center -space-x-1">
        <div className="transform -rotate-6 hover:rotate-0 transition-transform">
          <PeruFlag className={flagStyle} />
        </div>
        <div className="transform rotate-6 hover:rotate-0 transition-transform z-10">
          <VenezuelaFlag className={flagStyle} />
        </div>
      </div>
      <span className="text-xs font-black text-white tracking-wider font-montserrat flex items-center gap-1">
        <span className="text-red-400">PERÚ</span>
        <span className="text-[#2dd4bf]">&</span>
        <span className="text-amber-300">VENEZUELA</span>
      </span>
    </div>
  );
};
