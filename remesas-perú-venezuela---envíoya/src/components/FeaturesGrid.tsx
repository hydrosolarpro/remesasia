import React from 'react';
import { FEATURES_DATA } from '../data/appData';
import { Bell, LayoutDashboard, Calculator, TrendingUp, Users, MessageSquare, Zap } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-6 h-6 text-[#006b5f]" />,
  Calculator: <Calculator className="w-6 h-6 text-[#006b5f]" />,
  TrendingUp: <TrendingUp className="w-6 h-6 text-[#006b5f]" />,
  Users: <Users className="w-6 h-6 text-[#006b5f]" />,
  Bell: <Bell className="w-6 h-6 text-[#006b5f]" />,
  MessageSquare: <MessageSquare className="w-6 h-6 text-[#006b5f]" />,
  Zap: <Zap className="w-6 h-6 text-[#006b5f]" />,
};

export const FeaturesGrid: React.FC = () => {
  return (
    <section id="diferentes" className="bg-[#f8f9ff] text-[#0b1c30] py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#002045] font-montserrat tracking-tight">
            Por qué somos diferentes
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-medium">
            Diseñado específicamente para la conexión familiar Perú-Venezuela.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURES_DATA.map((feature) => {
            const icon = ICON_MAP[feature.iconName] || <Zap className="w-6 h-6 text-[#006b5f]" />;
            return (
              <div
                key={feature.id}
                className="group relative rounded-2xl bg-white p-8 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  
                  {/* Icon Container with Light Teal Tint */}
                  <div className="w-12 h-12 rounded-xl bg-[#62fae3]/20 border border-[#2dd4bf]/40 flex items-center justify-center transition-transform group-hover:scale-110">
                    {icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-[#002045] font-montserrat tracking-tight">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 text-sm leading-relaxed font-normal">
                    {feature.description}
                  </p>

                </div>

                {/* Subtle bottom indicator line */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-[#006b5f] group-hover:text-[#002045]">
                  <span>100% Automático & Verificado</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
