import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, ArrowRight, ShieldCheck, Clock, TrendingUp, CheckCircle2, Sparkles, Activity } from 'lucide-react';

interface RateSimulatorProps {
  onOpenDemoModal: () => void;
}

export const RateSimulator: React.FC<RateSimulatorProps> = ({ onOpenDemoModal: _onOpenDemoModal }) => {
  const [soles, setSoles] = useState<number>(100);
  const [tasa] = useState<number>(235.00);
  const [bcvUsd] = useState<number>(36.50);
  const [bcvEur] = useState<number>(39.80);
  const [rentabilidadPercent] = useState<number>(5.0);

  const bolivares = soles * tasa;
  const dolaresBcv = bolivares / bcvUsd;
  const eurosBcv = bolivares / bcvEur;
  const gananciaSoles = (soles * (rentabilidadPercent / 100));

  return (
    <section id="simulator" className="py-20 px-4 bg-slate-950 relative overflow-hidden">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider shadow-lg shadow-blue-500/10">
            <Calculator className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Simulador de Negocio en Vivo</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tight">
            Calculadora de Conversión & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">Rentabilidad</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Prueba cómo la plataforma calcula automáticamente la conversión de Soles a Bolívares y la conversión a dólares y euros con las tasas actualizadas del BCV.
          </p>
        </motion.div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Main Interactive Box */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-2xl hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between space-y-6 relative overflow-hidden backdrop-blur-md shimmer-effect glow-card-blue card-beam-highlight info-card-interactive"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Operación Soles (PE) ➔ Bolívares (VE)
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-400">
                Tasa Activa: Bs {tasa.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Soles Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Monto a Recibir (Perú)</span>
                  <span className="text-blue-400 font-bold">Soles (S/)</span>
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-extrabold text-xl">S/</span>
                  <input
                    type="number"
                    min="1"
                    value={soles}
                    onChange={(e) => setSoles(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-950 border border-slate-700/80 text-white font-mono font-black text-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[50, 100, 200, 500].map((quick) => (
                    <button
                      key={quick}
                      onClick={() => setSoles(quick)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        soles === quick
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      S/ {quick}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bolivares Output */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Monto a Transferir (Venezuela)</span>
                  <span className="text-emerald-400 font-bold">Bolívares (Bs)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-extrabold text-xl">Bs</span>
                  <input
                    type="text"
                    readOnly
                    value={bolivares.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-950/90 border border-emerald-500/50 text-emerald-400 font-mono font-black text-2xl focus:outline-none shadow-inner shadow-emerald-950/20"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Calculado automáticamente con Tasa = Bs {tasa}
                </p>
              </div>
            </div>

            {/* BCV Official Currency Rates Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 uppercase">
                <span>Conversión Equivalente con Tasas Oficiales del BCV</span>
                <span className="text-cyan-400 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Actualizado BCV
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between hover:border-cyan-500/40 transition-colors">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">Dólares ($ USD BCV)</div>
                    <div className="text-xl font-black font-mono text-cyan-400 mt-0.5">
                      $ {dolaresBcv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    Tasa: {bcvUsd.toFixed(2)} Bs/$
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between hover:border-purple-500/40 transition-colors">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">Euros (€ EUR BCV)</div>
                    <div className="text-xl font-black font-mono text-purple-400 mt-0.5">
                      € {eurosBcv.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    Tasa: {bcvEur.toFixed(2)} Bs/€
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Profit Breakdown Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left shadow-inner">
              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Rentabilidad Margen</div>
                <div className="text-xl font-extrabold text-white font-mono flex items-center justify-center sm:justify-start gap-1">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>{rentabilidadPercent}%</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Ganancia Operador (S/)</div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">
                  + S/ {gananciaSoles.toFixed(2)}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">Tiempo Estimado</div>
                <div className="text-xl font-extrabold text-blue-400 font-mono flex items-center justify-center sm:justify-start gap-1">
                  <Clock className="w-4 h-4" />
                  <span>4 - 6 min</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Info Cards & Supported Banks */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 flex flex-col justify-between space-y-4"
          >
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl hover:border-slate-700 transition-colors card-beam-highlight info-card-interactive">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Métodos Acreditados Integrados</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                La plataforma sincroniza comprobantes de pago de los principales sistemas financieros de Perú y Venezuela sin demoras.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇵🇪</span>
                    <span className="text-xs font-bold text-white">Medios en Perú</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] border border-purple-500/30">Yape</span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-500/30">Plin</span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px] border border-blue-500/30">Banca PERUANA</span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] border border-indigo-500/30">Otros Bancos</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇻🇪</span>
                    <span className="text-xs font-bold text-white">Bancos en Venezuela</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 font-mono font-bold text-[10px] border border-red-500/30">BDV</span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/30">Pago Móvil</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/30">Banesco</span>
                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px] border border-purple-500/30">Otros Bancos</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Funcionalidades Destacadas en esta Pantalla */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 space-y-3 shadow-xl hover:border-emerald-500/50 transition-colors card-beam-highlight info-card-interactive">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Funcionalidades Destacadas en esta Pantalla</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed font-mono">
                <li className="flex items-start gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span>Publicación de la tasa actual del día Soles ➔ Bs</span>
                </li>
                <li className="flex items-start gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                  <span>Registro de las solicitudes y notificación de pago de los clientes en Perú.</span>
                </li>
              </ul>
            </div>

            {/* Notifications Box */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-blue-500/30 space-y-3 shadow-xl hover:border-blue-500/50 transition-colors card-beam-highlight info-card-interactive">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Notificación Instantánea Cliente en Perú y Venezuela</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-base shrink-0 mt-0.5">🇵🇪</span>
                  <span>
                    Al validar el depósito del cliente en Perú, el sistema emite automáticamente un mensaje por Telegram usando un ChatBot indicando que ya fue exitoso su depósito.
                  </span>
                </li>
                <li className="flex items-start gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-base shrink-0 mt-0.5">🇻🇪</span>
                  <span>
                    Al validar el depósito en Venezuela, el sistema emite automáticamente un mensaje por Telegram usando un ChatBot indicando quien realiza la operación y el monto transferido para la confirmación con el cliente en Venezuela.
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

