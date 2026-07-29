import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Users, BarChart3, ClipboardList, CheckCircle2, Send, Sparkles, Smartphone, Eye } from 'lucide-react';
import { PeruFlag, VenezuelaFlag } from './CountryFlags';

export const PlatformScreenshotsCarousel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  const slides = [
    {
      id: 'inicio',
      title: 'Panel Principal & Tasa BCV',
      subtitle: 'Tasa garantizada del día y conversiones oficiales',
      icon: <LayoutDashboard className="w-5 h-5 text-[#2dd4bf]" />,
      badge: 'Vista Dashboard',
    },
    {
      id: 'cuentas',
      title: 'Beneficiarios Guardados',
      subtitle: 'Cuentas en Venezuela con autocompletado y vinculación Telegram',
      icon: <Users className="w-5 h-5 text-[#2dd4bf]" />,
      badge: 'Cuentas & Telegram',
    },
    {
      id: 'estadisticas',
      title: 'Estadísticas de Depósitos',
      subtitle: 'Gráficos interactivos de giros acumulados por período',
      icon: <BarChart3 className="w-5 h-5 text-[#2dd4bf]" />,
      badge: 'Estadísticas & Reportes',
    },
    {
      id: 'solicitudes',
      title: 'Historial de Solicitudes',
      subtitle: 'Seguimiento de envíos realizados en tiempo real',
      icon: <ClipboardList className="w-5 h-5 text-[#2dd4bf]" />,
      badge: 'Envíos en Curso',
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-[#0b1c30] via-[#091729] to-[#0b1c30] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2dd4bf]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2dd4bf]/10 border border-[#2dd4bf]/30 text-[#2dd4bf] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            VISTAS REALES DE LA PLATAFORMA
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-montserrat tracking-tight text-white leading-tight">
            Conoce la Plataforma por Dentro
          </h2>
          <p className="text-slate-300 text-base sm:text-lg font-normal leading-relaxed">
            Plataforma digital 100% gratuita, rápida y diseñada para una gestión transparente de tus giros de soles a bolívares soberanos.
          </p>
        </div>

        {/* Carousel Tabs Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {slides.map((slide, index) => {
            const isActive = activeTab === index;
            return (
              <button
                key={slide.id}
                onClick={() => {
                  setActiveTab(index);
                  setIsAutoPlaying(false);
                }}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  isActive
                    ? 'bg-[#142742] border-[#2dd4bf] text-white shadow-xl shadow-[#2dd4bf]/10 scale-[1.02]'
                    : 'bg-[#002045]/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#2dd4bf]" />
                )}
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-[#2dd4bf]/20 text-[#2dd4bf]' : 'bg-[#142742] text-slate-400'}`}>
                    {slide.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2dd4bf]">
                    {slide.badge}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white font-montserrat truncate">{slide.title}</h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{slide.subtitle}</p>
              </button>
            );
          })}
        </div>

        {/* Main Phone Screen View Frame */}
        <div className="relative max-w-4xl mx-auto bg-[#00142d] border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl">
          
          {/* Navigation Controls */}
          <button
            onClick={() => {
              setActiveTab((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
              setIsAutoPlaying(false);
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-[#002045]/80 hover:bg-[#2dd4bf] text-white hover:text-[#002045] border border-slate-700 transition-all shadow-xl"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              setActiveTab((prev) => (prev + 1) % slides.length);
              setIsAutoPlaying(false);
            }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-[#002045]/80 hover:bg-[#2dd4bf] text-white hover:text-[#002045] border border-slate-700 transition-all shadow-xl"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Device Mockup Shell */}
          <div className="max-w-[380px] sm:max-w-[420px] mx-auto bg-[#081526] border-4 border-[#142742] rounded-[36px] overflow-hidden shadow-2xl relative">
            
            {/* Phone Top Notch / Header Bar */}
            <div className="bg-[#0b1c30] px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-1.5 font-bold font-montserrat text-white text-[11px]">
                <span>Remesas</span>
                <span className="text-[#2dd4bf]">PERU-VENEZUELA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PeruFlag className="w-4 h-3" />
                <VenezuelaFlag className="w-4 h-3" />
              </div>
            </div>

            {/* SCREEN CONTENTS BASED ON ACTIVE TAB */}
            <div className="p-4 sm:p-5 space-y-4 min-h-[500px] text-slate-200 text-xs font-inter select-none">
              
              {/* SLIDE 0: INICIO & TASA BCV */}
              {activeTab === 0 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase">
                      • Cliente
                    </span>
                    <span className="text-[10px] text-slate-400">Martes, 28 de julio</span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white font-montserrat leading-tight">
                      Bienvenido a Remesas Perú-Venezuela, José Alfredo Silva Castillo
                    </h3>
                    <p className="text-[11px] text-[#2dd4bf] italic font-semibold mt-1">
                      "Ahora Venezuela libre y se volverá a levantar 💪"
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Horario de atención: 9:00 - 21:00
                    </span>
                  </div>

                  {/* Rate Cards Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#002045] border border-slate-700 space-y-1">
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        Tasa del día (Soles ➔ Bolívares)
                      </span>
                      <p className="text-lg font-black text-[#2dd4bf] font-montserrat">
                        Bs 235
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#002045] border border-slate-700 space-y-1">
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        BCV - USD / EUR
                      </span>
                      <p className="text-xs font-bold text-white font-mono">
                        $744.23 Bs
                      </p>
                      <p className="text-xs font-bold text-slate-300 font-mono">
                        €846.07 Bs
                      </p>
                    </div>
                  </div>

                  {/* Nueva Solicitud Card */}
                  <div className="p-4 rounded-xl bg-[#001c3d] border border-slate-700 space-y-2">
                    <span className="text-xs font-extrabold text-white uppercase font-montserrat block">
                      NUEVA SOLICITUD
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Ingrese el monto solicitado en la calculadora.
                    </p>
                    <div className="p-3 rounded-lg bg-[#081526] border border-slate-800 flex items-center justify-between">
                      <span className="text-xl font-bold font-mono text-white">0.00</span>
                      <span className="text-[11px] font-semibold text-[#2dd4bf]">Soles a enviar</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 1: CUENTAS DE BENEFICIARIOS */}
              {activeTab === 1 && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-extrabold text-white font-montserrat">
                      Cuentas de beneficiarios guardadas
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Se usan para autocompletar tus solicitudes.
                    </p>
                  </div>

                  {/* Beneficiary Item 1 */}
                  <div className="p-3 rounded-xl bg-[#002045] border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">María Bello</span>
                      <div className="flex gap-2 text-[10px] font-semibold">
                        <span className="text-[#2dd4bf]">Editar</span>
                        <span className="text-rose-400">Eliminar</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      C.I. 12738042 • 04128715429
                    </p>
                    <p className="text-[10px] text-slate-300 font-mono">
                      BBVA • 0180224570100217919
                    </p>
                    <div className="pt-1 text-[9px] uppercase font-bold text-slate-400">
                      CONFIGURACIÓN DE NOTIFICACIONES DEL BENEFICIARIO
                    </div>
                    <button className="w-full py-1.5 rounded-lg bg-[#081526] border border-slate-700 text-[#2dd4bf] text-[10px] font-bold">
                      Vincular Telegram del beneficiario
                    </button>
                  </div>

                  {/* Beneficiary Item 2 */}
                  <div className="p-3 rounded-xl bg-[#002045] border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Katherine Cordero</span>
                      <div className="flex gap-2 text-[10px] font-semibold">
                        <span className="text-[#2dd4bf]">Editar</span>
                        <span className="text-rose-400">Eliminar</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      C.I. 29456731 • +51998117163
                    </p>
                    <p className="text-[10px] text-slate-300 font-mono">
                      BANCO DE VENEZUELA • 00125862359453
                    </p>
                    <div className="pt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Telegram vinculado
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 2: ESTADÍSTICAS */}
              {activeTab === 2 && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <h3 className="text-base font-extrabold text-white font-montserrat">
                      Estadística de depósitos realizados
                    </h3>
                  </div>

                  {/* Filter Badges */}
                  <div className="flex flex-wrap gap-1.5 text-[9px] font-semibold">
                    <span className="px-2.5 py-1 rounded-full bg-[#142742] text-slate-300">
                      📅 Solicitudes de hoy
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#2dd4bf] text-[#002045] font-bold">
                      Mes
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#142742] text-slate-300">
                      Año
                    </span>
                  </div>

                  {/* Monthly Total Card */}
                  <div className="p-3.5 rounded-xl bg-[#002045] border border-slate-700 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 block">Depósitos</span>
                      <span className="text-lg font-black text-white font-montserrat">14</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Monto total</span>
                      <span className="text-lg font-black text-[#2dd4bf] font-montserrat">S/ 2769.00</span>
                    </div>
                  </div>

                  {/* Bar Chart Mockup */}
                  <div className="p-3.5 rounded-xl bg-[#001c3d] border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-white">Monto solicitado vs. período (S/)</span>
                      <div className="flex gap-1">
                        <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[8px]">Barras</span>
                        <span className="px-2 py-0.5 rounded bg-[#142742] text-slate-300 text-[8px]">Circular</span>
                      </div>
                    </div>

                    <div className="h-28 flex items-end justify-between gap-2 px-2 pt-4 border-b border-slate-700">
                      <div className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[9px] font-mono text-indigo-300">300</span>
                        <div className="w-full bg-indigo-500 rounded-t-md h-10"></div>
                      </div>
                      <div className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[9px] font-mono text-indigo-300">1000</span>
                        <div className="w-full bg-indigo-500 rounded-t-md h-20"></div>
                      </div>
                      <div className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[9px] font-mono text-indigo-300">1019</span>
                        <div className="w-full bg-indigo-400 rounded-t-md h-22"></div>
                      </div>
                      <div className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[9px] font-mono text-indigo-300">450</span>
                        <div className="w-full bg-indigo-500 rounded-t-md h-12"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 3: SOLICITUDES EN CURSO */}
              {activeTab === 3 && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400">
                      SOLICITUDES EN CURSO (0)
                    </h3>
                    <p className="text-[10px] text-slate-500">No tienes solicitudes en curso.</p>
                  </div>

                  <h3 className="text-xs font-extrabold uppercase text-[#2dd4bf] pt-1">
                    SOLICITUDES REALIZADAS HOY (8)
                  </h3>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    <div className="p-2.5 rounded-lg bg-[#002045] border border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">#14 • 28/7, 07:11 p. m.</span>
                        <p className="font-bold text-white text-xs">Katherine Cordero</p>
                      </div>
                      <span className="text-xs font-bold text-[#2dd4bf] font-mono">S/ 450.00</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#002045] border border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">#13 • 28/7, 03:34 p. m.</span>
                        <p className="font-bold text-white text-xs">María José Silva Ortiz</p>
                      </div>
                      <span className="text-xs font-bold text-[#2dd4bf] font-mono">S/ 300.00</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#002045] border border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">#11 • 28/7, 07:02 p. m.</span>
                        <p className="font-bold text-white text-xs">María Bello</p>
                      </div>
                      <span className="text-xs font-bold text-[#2dd4bf] font-mono">S/ 137.00</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#002045] border border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono">#9 • 28/7, 02:33 a. m.</span>
                        <p className="font-bold text-white text-xs">Rodrigo Silva</p>
                      </div>
                      <span className="text-xs font-bold text-[#2dd4bf] font-mono">S/ 120.00</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* App Bottom Navigation Bar matching real UI */}
            <div className="bg-[#0b1c30] border-t border-slate-800 px-3 py-2 flex items-center justify-around text-[9px] text-slate-400 font-medium">
              <button onClick={() => setActiveTab(0)} className={`flex flex-col items-center gap-0.5 ${activeTab === 0 ? 'text-[#2dd4bf] font-bold' : ''}`}>
                <span>🏠</span>
                <span>Inicio</span>
              </button>
              <button onClick={() => setActiveTab(3)} className={`flex flex-col items-center gap-0.5 ${activeTab === 3 ? 'text-[#2dd4bf] font-bold' : ''}`}>
                <span>📋</span>
                <span>Solicitudes</span>
              </button>
              <button onClick={() => setActiveTab(1)} className={`flex flex-col items-center gap-0.5 ${activeTab === 1 ? 'text-[#2dd4bf] font-bold' : ''}`}>
                <span>💳</span>
                <span>Mis cuentas</span>
              </button>
              <button onClick={() => setActiveTab(2)} className={`flex flex-col items-center gap-0.5 ${activeTab === 2 ? 'text-[#2dd4bf] font-bold' : ''}`}>
                <span>📊</span>
                <span>Estadísticas</span>
              </button>
            </div>

          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center gap-2 mt-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveTab(i);
                  setIsAutoPlaying(false);
                }}
                className={`h-2.5 rounded-full transition-all ${
                  activeTab === i ? 'w-8 bg-[#2dd4bf]' : 'w-2.5 bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Ver diapositiva ${i + 1}`}
              />
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};
