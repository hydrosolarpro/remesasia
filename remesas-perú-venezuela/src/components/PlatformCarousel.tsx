import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Send,
  Users,
  BarChart3,
  Smartphone,
  ShieldCheck,
  Search,
  ExternalLink,
  Bot,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { OPERADOR_PERU_SCREENSHOTS, OPERADOR_VENEZUELA_PREVIEWS, CLIENT_SESSION_PREVIEWS } from '../data/screenshotsData';
import { ScreenshotItem } from '../types';

export const PlatformCarousel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'operador_peru' | 'operador_venezuela' | 'sesion_cliente'>('operador_peru');
  const [selectedTag, setSelectedTag] = useState<string>('Registro de Clientes');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  // Auto-play state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  // Select items list based on tab
  const getTabItems = (): ScreenshotItem[] => {
    if (activeTab === 'operador_peru') {
      if (selectedTag === 'Registro de Clientes') return OPERADOR_PERU_SCREENSHOTS;
      return OPERADOR_PERU_SCREENSHOTS.filter((item) => item.tag.toLowerCase().includes(selectedTag.toLowerCase()));
    }
    if (activeTab === 'operador_venezuela') return OPERADOR_VENEZUELA_PREVIEWS;
    return CLIENT_SESSION_PREVIEWS;
  };

  const currentItems = getTabItems();
  const currentItem = currentItems[currentIndex] || currentItems[0] || OPERADOR_PERU_SCREENSHOTS[0];

  // Auto-advance slideshow timer
  useEffect(() => {
    if (!isPlaying) {
      setProgress(0);
      return;
    }

    const intervalMs = 50;
    const totalDurationMs = 4500;
    const increment = (intervalMs / totalDurationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((prevIdx) => (prevIdx + 1) % currentItems.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentItems.length, currentIndex]);

  const selectIndex = (idx: number) => {
    setCurrentIndex(idx);
    setProgress(0);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % currentItems.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + currentItems.length) % currentItems.length);
    setProgress(0);
  };

  const availableTags = [
    'Registro de Clientes',
    'Panel General',
    'Reportes & Fechas',
    'Gráficos de Operaciones',
    'Tasa & Cambio',
    'Multi-Operador',
    'Notificaciones Telegram',
    'Validación & WhatsApp'
  ];

  return (
    <section id="carousel" className="py-20 px-4 bg-slate-950 relative">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
            <Smartphone className="w-4 h-4" />
            <span>Galería Interactiva de la Plataforma</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tight">
            Fotos de la Plataforma en <span className="text-blue-500">Acción</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Explora las capturas de pantalla reales del sistema en sus diferentes sesiones de trabajo. Revisa los paneles de control, gráficos, notificaciones en Telegram y validaciones.
          </p>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pb-2 w-full">
          <button
            onClick={() => {
              setActiveTab('operador_peru');
              setCurrentIndex(0);
              setSelectedTag('Registro de Clientes');
            }}
            className={`w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'operador_peru'
                ? 'bg-blue-600 text-white shadow-blue-500/25 scale-[1.02] sm:scale-105 border border-blue-400/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <span className="text-base">🇵🇪</span>
            <span>Operador de Perú</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('operador_venezuela');
              setCurrentIndex(0);
            }}
            className={`w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'operador_venezuela'
                ? 'bg-emerald-600 text-white shadow-emerald-500/25 scale-[1.02] sm:scale-105 border border-emerald-400/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <span className="text-base">🇻🇪</span>
            <span>Operador de Venezuela</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sesion_cliente');
              setCurrentIndex(0);
            }}
            className={`w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              activeTab === 'sesion_cliente'
                ? 'bg-indigo-600 text-white shadow-indigo-500/25 scale-[1.02] sm:scale-105 border border-indigo-400/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <span className="text-base">👤</span>
            <span>Sesión Cliente</span>
          </button>
        </div>

        {/* Subtag Filters for Operador Perú */}
        {activeTab === 'operador_peru' && (
          <div className="flex flex-wrap items-center justify-center gap-2 pb-2 w-full">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTag(tag);
                  selectIndex(0);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Carousel Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl">
          {/* Left: Mobile Screen Mockup Rendering */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
            {/* Phone Frame Mockup */}
            <div className="w-full max-w-[300px] xs:max-w-[340px] sm:max-w-[380px] bg-slate-950 rounded-[32px] sm:rounded-[38px] p-2.5 sm:p-3 border-4 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group">
              {/* Top Speaker Notch */}
              <div className="w-28 h-4 bg-slate-900 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Phone App Display Screen */}
              <div className="w-full min-h-[520px] bg-slate-950 rounded-[28px] overflow-hidden text-white p-4 font-sans text-xs flex flex-col justify-between border border-slate-800 relative">
                {/* App Top Status Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs tracking-tight text-white uppercase font-mono">
                      Remesas <span className="text-blue-500">PERÚ-VE</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold">
                      DEMO
                    </span>
                    <span className="text-sm">🇵🇪 🇻🇪</span>
                  </div>
                </div>

                {/* Dynamic Screen Specific Content Visuals */}
                <div className="py-4 space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1">
                  {/* Screen Header Tag */}
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold text-[10px] uppercase">
                      {currentItem.badgeText}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {currentItem.id}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">
                    {currentItem.title}
                  </h3>

                  {/* Render simulated mockup interface based on screen item */}
                  {currentItem.id === 'op-pe-1' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Compartir rentabilidad VE</span>
                        <div className="w-8 h-4 bg-blue-600 rounded-full flex items-center justify-end px-0.5">
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Horario de atención</span>
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">9:00 - 21:00</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 italic text-[11px] text-slate-300">
                        "Ahora Venezuela libre y se volverá a levantar 💪"
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 grid grid-cols-2 gap-2 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono">Operaciones Hoy</div>
                          <div className="text-sm font-bold text-white font-mono">1</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono">Ganancia Hoy</div>
                          <div className="text-sm font-bold text-emerald-400 font-mono">S/ 2.50</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-pe-2' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Resumen (2 op)</span>
                        <span className="text-xs font-mono font-bold text-blue-400">S/ 500.00</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-300">Rentabilidad (5%)</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">S/ 25.00</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 text-[10px] space-y-1 font-mono">
                        <div className="font-bold text-slate-300">Por miembro del equipo:</div>
                        <div className="flex justify-between text-slate-400">
                          <span>Operador PE: Jose Silva</span>
                          <span className="text-white font-bold">2 op · S/ 500.00</span>
                        </div>
                      </div>
                      <div className="w-full py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-center font-bold text-blue-300 font-mono text-xs">
                        Descargar PDF
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-pe-3' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between font-mono">
                        <span className="text-[11px] font-bold text-white">Julio 2026 (17 op)</span>
                        <span className="text-xs font-bold text-emerald-400">Ganancia S/ 150.95</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 font-mono mb-2">Monto vs. período (S/)</div>
                        <div className="flex items-end justify-between h-20 pt-2 border-b border-slate-800 px-2">
                          <div className="w-5 bg-blue-500 rounded-t h-[30%]" title="07-26: S/300" />
                          <div className="w-5 bg-blue-500 rounded-t h-[90%]" title="07-27: S/1200" />
                          <div className="w-5 bg-blue-500 rounded-t h-[75%]" title="07-28: S/1019" />
                          <div className="w-5 bg-blue-500 rounded-t h-[45%]" title="07-29: S/500" />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono pt-1">
                          <span>07-26</span>
                          <span>07-27</span>
                          <span>07-28</span>
                          <span>07-29</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-pe-5' && (
                    <div className="space-y-2">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Tasa del día (Soles → Bolívares)</div>
                        <div className="text-2xl font-black font-mono text-emerald-400 my-1">Bs 235</div>
                        <div className="text-[10px] text-blue-400 font-mono font-bold">Actualizar tasa →</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center font-mono">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Rentabilidad</div>
                          <div className="text-sm font-bold text-white">5%</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Operaciones Hoy</div>
                          <div className="text-sm font-bold text-white">1</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-pe-7' && (
                    <div className="space-y-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="font-bold text-blue-400 font-mono uppercase text-[10px]">OPERADORES EN VENEZUELA (1/2)</div>
                        <div className="flex justify-between text-white font-mono">
                          <span>Jose Silva</span>
                          <span className="text-emerald-400">Activo</span>
                        </div>
                        <div className="text-slate-400 font-mono text-[10px]">+51960442025 | jsilvacorpoelec@gmail.com</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="font-bold text-emerald-400 font-mono uppercase text-[10px]">OPERADORES EN PERÚ (1/1)</div>
                        <div className="flex justify-between text-white font-mono">
                          <span>Cheo</span>
                          <span className="text-emerald-400">Activo</span>
                        </div>
                        <div className="text-slate-400 font-mono text-[10px]">sematicerplus@gmail.com</div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-pe-8' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
                        <div className="flex items-center gap-1 font-bold text-emerald-400">
                          <Bot className="w-3.5 h-3.5" />
                          <span>RemesasPV_bot (Telegram)</span>
                        </div>
                        <div className="text-slate-200">
                          ✅ Tu depósito de S/ 450.00 fue validado. En breve se realizará la transferencia.
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
                        <div className="text-slate-200">
                          ✅ Se ha transferido a su cuenta 0012452316595 del Banco de Venezuela Bs 11,750.00.
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-pe-10' && (
                    <div className="space-y-1.5 text-[10px] font-mono">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="flex justify-between font-bold text-white">
                          <span>#17 · 29/7 06:54 a.m.</span>
                          <span className="text-blue-400">S/ 50.00</span>
                        </div>
                        <div className="text-slate-300">Beneficiario VE: Rodrigo Silva</div>
                        <div className="text-slate-400">Banco de Venezuela: 0012452316595</div>
                        <div className="text-emerald-400 font-bold">Recibe: Bs 11,750.00 (Yape)</div>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-center">
                        ✓ Depósito validado en Perú & VE (6 min)
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-ve-1' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center font-mono font-bold text-emerald-400 text-[11px]">
                        🇻🇪 Operador Venezuela · Solo lectura
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono">Tasa del día (Soles → Bolívares)</div>
                        <div className="text-2xl font-black text-emerald-400 font-mono">Bs 235</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 italic text-[10px] text-slate-300">
                        "Ahora Venezuela libre y se volverá a levantar 💪"
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-[10px] font-mono text-slate-400">
                        Horario: 9:00 - 21:00 | Operaciones hoy: 1
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-ve-2' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-blue-400 font-bold uppercase">Cliente Perú:</div>
                        <div className="text-white font-bold">José Alfredo Silva Castillo</div>
                        <div className="text-slate-400">Tel: 960442025 | hydrosolarpro@gmail.com</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1">
                        <div className="text-emerald-400 font-bold uppercase">Beneficiario Venezuela:</div>
                        <div className="text-white font-bold">Rodrigo Silva (C.I. 32456789)</div>
                        <div className="text-slate-300">Banco de Venezuela: 0012452316595</div>
                        <div className="text-emerald-400 font-extrabold text-xs pt-1">Recibe: Bs 11,750.00</div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-ve-3' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-1">
                        <div className="text-emerald-400 font-bold">✓ Depósito validado en Perú (07:02 a.m.)</div>
                        <div className="text-slate-300">Validó: Jose Silva · S/ 50.00 Yape</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-1">
                        <div className="text-emerald-400 font-bold">✓ Acreditado en Venezuela (08:08 a.m.)</div>
                        <div className="text-slate-300">Validó: Jose Silva · Bs 11,750.00</div>
                      </div>
                      <div className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-center text-xs">
                        💬 Notificar por WhatsApp al beneficiario
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-ve-4' && (
                    <div className="space-y-2">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-[10px] font-mono">
                        <span className="text-white font-bold">Julio 2026 (17 op)</span>
                        <span className="text-emerald-400 font-bold">S/ 3,019.00</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="text-[10px] text-slate-400 font-mono">Monto vs. período (S/)</div>
                        <div className="flex items-end justify-between h-16 pt-2 border-b border-slate-800 px-2">
                          <div className="w-4 bg-emerald-500 rounded-t h-[30%]" title="07-26: S/300" />
                          <div className="w-4 bg-emerald-500 rounded-t h-[90%]" title="07-27: S/1200" />
                          <div className="w-4 bg-emerald-500 rounded-t h-[75%]" title="07-28: S/1019" />
                          <div className="w-4 bg-emerald-500 rounded-t h-[45%]" title="07-29: S/500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-center">
                        <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 font-bold">
                          Descargar PDF
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 font-bold">
                          Exportar Excel
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-cli-1' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-emerald-400 font-mono font-bold">● Cliente</div>
                        <div className="text-xs font-bold text-white leading-tight">
                          Bienvenido a Remesas Perú-Venezuela, José Alfredo Silva Castillo
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">Miércoles, 29 de julio de 2026</div>
                        <div className="text-[10px] italic text-emerald-300 font-serif">"Ahora Venezuela libre y se volvera a levantar 💪"</div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-center">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="text-[9px] text-slate-400">Tasa del día</div>
                          <div className="text-sm font-black text-emerald-400">Bs 235</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="text-[9px] text-slate-400">BCV USD/EUR</div>
                          <div className="text-[10px] font-bold text-white">$744.23 Bs</div>
                          <div className="text-[9px] text-slate-400">€846.07 Bs</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-blue-500/40 space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono font-bold">NUEVA SOLICITUD (Soles a enviar)</div>
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-base font-bold text-white flex justify-between">
                          <span>100</span>
                          <span className="text-xs text-slate-500 font-normal">Soles</span>
                        </div>
                        <div className="text-sm font-black font-mono text-emerald-400 pt-1">
                          Bs 23,500.00
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">≈ $31.58 USD · €27.78 EUR</div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-cli-2' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="text-slate-300 font-bold">¿Quién recibe en Venezuela?</div>
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 shrink-0">María Bello</span>
                        <span className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold shrink-0">Rodrigo Silva</span>
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 shrink-0">Katherine</span>
                      </div>
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-white font-bold">
                          Nombre: Rodrigo Silva
                        </div>
                        <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          Teléfono: +51960442025
                        </div>
                        <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          Cédula: 32456789
                        </div>
                        <div className="flex gap-1">
                          <span className="flex-1 p-1 text-center bg-blue-600 text-white rounded font-bold">Transferencia</span>
                          <span className="flex-1 p-1 text-center bg-slate-950 text-slate-400 rounded">Pago móvil</span>
                        </div>
                        <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-white">
                          Banco: Banco de Venezuela
                        </div>
                        <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-white font-mono">
                          N°: 0012452316595
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-cli-3' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="text-white font-bold text-xs">Datos para pagar en Perú - Jose Silva</div>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Yape / Plin: 960442025</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 font-bold">Copiar</span>
                        </div>
                        <div className="border-t border-slate-800 pt-1 space-y-0.5">
                          <div className="text-emerald-400 font-bold">BCP · JOSE ALFREDO SILVA CASTILLO</div>
                          <div className="text-slate-300 text-[9px]">Cuenta: 19498905205045</div>
                          <div className="text-slate-400 text-[9px]">CCI: 00219419890520504590</div>
                        </div>
                        <div className="border-t border-slate-800 pt-1 space-y-0.5">
                          <div className="text-blue-400 font-bold">BBVA · Leonardo Silva</div>
                          <div className="text-slate-300 text-[9px]">Cuenta: 1081542645245</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center font-bold">
                        <span className="p-1.5 rounded-lg bg-blue-600 text-white">Yape</span>
                        <span className="p-1.5 rounded-lg bg-slate-900 text-slate-300">Plin</span>
                        <span className="p-1.5 rounded-lg bg-slate-900 text-slate-300">Transferencia</span>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-cli-4' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="text-slate-300 font-bold">SOLICITUDES REALIZADAS HOY (1)</div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex justify-between text-white font-bold">
                          <span>#15 · Rodrigo Silva</span>
                          <span className="text-emerald-400">S/ 50.00</span>
                        </div>
                        <div className="text-slate-400">Banco de Venezuela: 0012452316595</div>
                        <div className="text-slate-300 font-bold">Recibe: Bs 11,750.00 (Yape)</div>
                        <div className="flex justify-between pt-1 border-t border-slate-800 text-emerald-400 text-[9px]">
                          <span>● Pago validado en Perú</span>
                          <span>● Depósito en VE</span>
                        </div>
                        <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold text-center">
                          ✓ Depósito validado en cuenta del Beneficiario
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-cli-5' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="text-slate-300 font-bold">Cuentas de beneficiarios guardadas</div>
                      <div className="space-y-1.5">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                          <div className="flex justify-between text-white font-bold">
                            <span>María Bello</span>
                            <span className="text-blue-400 text-[9px]">Editar</span>
                          </div>
                          <div className="text-slate-400 text-[9px]">C.I. 12738042 · BBVA 0180224570100217919</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-0.5">
                          <div className="flex justify-between text-white font-bold">
                            <span>Rodrigo Silva</span>
                            <span className="text-emerald-400 text-[9px]">✓ Telegram</span>
                          </div>
                          <div className="text-slate-400 text-[9px]">Banco de Venezuela · 0012452316595</div>
                          <div className="text-emerald-400 text-[9px]">✓ Telegram vinculado (@Josesilva2023)</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                          <div className="flex justify-between text-white font-bold">
                            <span>Katherine Cordero</span>
                            <span className="text-emerald-400 text-[9px]">✓ Telegram</span>
                          </div>
                          <div className="text-slate-400 text-[9px]">BANCO DE VENEZUELA · 00125862359453</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentItem.id === 'op-cli-6' && (
                    <div className="space-y-2 text-[10px] font-mono">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-white font-bold">
                        <span>Julio 2026 (15 Depósitos)</span>
                        <span className="text-emerald-400">S/ 2,819.00</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                        <div className="text-slate-400 text-[9px]">Monto solicitado vs. período (S/)</div>
                        <div className="w-20 h-20 rounded-full border-8 border-emerald-400 border-t-blue-500 border-r-amber-400 mx-auto flex items-center justify-center font-bold text-white">
                          S/ 2819
                        </div>
                        <div className="text-[9px] text-slate-400">Gráfico Donut Interactivo</div>
                      </div>
                    </div>
                  )}

                  {/* Fallback general preview */}
                  {!['op-pe-1', 'op-pe-2', 'op-pe-3', 'op-pe-5', 'op-pe-7', 'op-pe-8', 'op-pe-10', 'op-ve-1', 'op-ve-2', 'op-ve-3', 'op-ve-4', 'op-cli-1', 'op-cli-2', 'op-cli-3', 'op-cli-4', 'op-cli-5', 'op-cli-6'].includes(currentItem.id) && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-slate-300 font-bold">{currentItem.description}</div>
                      <ul className="space-y-1 text-[10px] text-slate-400">
                        {currentItem.details.map((detail, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <span className="text-blue-400">▪</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bottom App Navigation */}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-[9px] text-slate-500 font-mono font-bold">
                  <div className="flex flex-col items-center text-blue-400">
                    <span>📋</span>
                    <span>Panel</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>📊</span>
                    <span>Estadísticas</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>👥</span>
                    <span>Clientes</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>👤</span>
                    <span>Perfil</span>
                  </div>
                </div>
              </div>

              {/* Lightbox Zoom Trigger Overlay */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-[38px] flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-wider cursor-pointer backdrop-blur-xs"
              >
                <Maximize2 className="w-5 h-5 text-blue-400" />
                <span>Ampliar Captura Completa</span>
              </button>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handlePrev}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white transition-all cursor-pointer"
                title="Anterior Captura"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-400">
                <span className="text-white">{currentIndex + 1}</span> / {currentItems.length}
              </span>
              <button
                onClick={handleNext}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white transition-all cursor-pointer"
                title="Siguiente Captura"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right: Detailed Feature Breakdown Card */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400">
              <span>Captura {currentIndex + 1} de {currentItems.length}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black italic uppercase text-white leading-tight">
              {currentItem.title}
            </h3>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {currentItem.description}
            </p>

            {/* Feature Bullet Points */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Funcionalidades Destacadas en esta Pantalla:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentItem.details.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-200 leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Tags Chips */}
            <div className="pt-2 flex flex-wrap gap-2 font-mono">
              {currentItem.keyFeatures.map((feat, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-blue-400"
                >
                  #{feat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Automatic Progression Selection Bar & Cards */}
        <div className="pt-4 space-y-4">
          {/* Header Controls & Auto-Play Progress Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isPlaying
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 text-blue-400" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isPlaying ? 'PAUSAR AVANCE AUTOMÁTICO' : 'REANUDAR AVANCE'}</span>
                </button>
                <div className="text-xs font-mono text-slate-400">
                  Captura <span className="text-white font-bold">{currentIndex + 1}</span> de <span className="text-white font-bold">{currentItems.length}</span>
                </div>
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shadow-lg shadow-blue-500/20 transition-all"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Auto-play Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/80">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-75 ease-linear"
                style={{ width: isPlaying ? `${progress}%` : '0%' }}
              />
            </div>
          </div>

          {/* Selection Cards Grid (No Horizontal Scroll) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {currentItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => selectIndex(idx)}
                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between h-24 cursor-pointer relative overflow-hidden ${
                  currentIndex === idx
                    ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/25 scale-[1.02] ring-2 ring-blue-500/40'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                }`}
              >
                {currentIndex === idx && isPlaying && (
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-75"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <div className="text-[10px] font-mono font-bold text-blue-400 uppercase truncate">
                  #{idx + 1} · {item.tag}
                </div>
                <div className="text-xs font-bold text-white line-clamp-2 leading-tight">
                  {item.title}
                </div>
                <div className="text-[9px] font-mono text-slate-500">
                  {item.keyFeatures.length} Funciones
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold text-xs uppercase">
                  {currentItem.badgeText}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {currentItem.title}
                </h3>
              </div>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Detailed Technical Extraction */}
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                  Especificación de Pantalla
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentItem.description}
                </p>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-mono font-bold text-slate-400">Registros y Datos en Vivo:</div>
                  <ul className="space-y-2 text-xs text-slate-200">
                    {currentItem.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Mock Data Breakdown */}
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Métricas Extraídas
                </h4>

                <div className="space-y-3 text-xs font-mono">
                  {currentItem.mockData.tasa && (
                    <div className="flex justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Tasa Registrada:</span>
                      <span className="font-bold text-emerald-400">Bs {currentItem.mockData.tasa}</span>
                    </div>
                  )}
                  {currentItem.mockData.montoSoles && (
                    <div className="flex justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Monto Soles (S/):</span>
                      <span className="font-bold text-white">S/ {currentItem.mockData.montoSoles.toFixed(2)}</span>
                    </div>
                  )}
                  {currentItem.mockData.montoBolivares && (
                    <div className="flex justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Monto Bolívares (Bs):</span>
                      <span className="font-bold text-emerald-400">Bs {currentItem.mockData.montoBolivares.toLocaleString('es-VE')}</span>
                    </div>
                  )}
                  {currentItem.mockData.ganancia && (
                    <div className="flex justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Ganancia Neta:</span>
                      <span className="font-bold text-emerald-400">{currentItem.mockData.ganancia}</span>
                    </div>
                  )}
                  {currentItem.mockData.bancoDestino && (
                    <div className="flex justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Banco Acreditado:</span>
                      <span className="font-bold text-blue-400">{currentItem.mockData.bancoDestino}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setLightboxOpen(false)}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    Cerrar Vista Detallada
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
