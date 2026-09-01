import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Sparkles, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PLANES, MAX_SLIDER, tramoAMedida, precioAMedida, PRECIO_POR_CLIENTE_MEDIDA } from '../data/planes';

interface CalculadoraPlanProps {
  onOpenDemoModal: () => void;
}

const ACCESOS_RAPIDOS = [30, 50, 150, 350, 550, 850, 1200];

export const CalculadoraPlan: React.FC<CalculadoraPlanProps> = ({ onOpenDemoModal }) => {
  const [clientes, setClientes] = useState(120);
  const tramo = tramoAMedida(clientes);
  const precioMedida = precioAMedida(clientes);

  return (
    <section id="calculadora-plan" className="py-24 px-4 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider shadow-lg shadow-blue-500/10">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Encuentra tu plan ideal</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-wide">
            ¿Cuál Plan te <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Conviene</span> a la medida del número de clientes?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Dinos cuántos clientes manejas y te calculamos tu plan a la medida: S/ {PRECIO_POR_CLIENTE_MEDIDA} por cliente al mes.
            Considera siempre un poco más de clientes según tu crecimiento mensual.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Slider box */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 shadow-2xl flex flex-col justify-between gap-6 relative overflow-hidden backdrop-blur-md shimmer-effect glow-card-blue card-beam-highlight info-card-interactive"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">¿Cuántos clientes manejas en tu negocio?</h3>
                  <p className="text-xs text-slate-400">Mueve el deslizador o escribe el número exacto</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950 border border-blue-500/40 shadow-inner shrink-0">
                <input
                  type="number"
                  min={1}
                  value={clientes}
                  onChange={(e) => setClientes(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-20 bg-transparent text-blue-400 font-mono font-black text-2xl text-right focus:outline-none"
                />
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Clientes</span>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={10}
                max={MAX_SLIDER}
                step={10}
                value={Math.min(clientes, MAX_SLIDER)}
                onChange={(e) => setClientes(parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-full appearance-none bg-slate-800 cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/40 [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>10 clientes</span>
                <span>200</span>
                <span>400</span>
                <span>600</span>
                <span>1,000</span>
                <span>1,200+ clientes</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">Accesos rápidos:</span>
              <div className="flex flex-wrap gap-2">
                {ACCESOS_RAPIDOS.map((valor) => (
                  <button
                    key={valor}
                    onClick={() => setClientes(valor)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      clientes === valor
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {valor === MAX_SLIDER ? `+${valor}` : valor}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Recommended plan card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-blue-950/50 via-slate-900 to-slate-950 border-2 border-blue-500 shadow-2xl shadow-blue-500/25 flex flex-col justify-between gap-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Tu plan a la medida
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">Automático</span>
            </div>

            {tramo ? (
              <>
                <div>
                  <h3 className="text-3xl font-black font-mono text-white uppercase tracking-wider">A la medida</h3>
                  <div className="text-3xl font-extrabold font-mono text-white mt-2">
                    S/ {precioMedida} <span className="text-xs font-normal text-slate-400">/mes</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {clientes} clientes × S/ {PRECIO_POR_CLIENTE_MEDIDA} — incluye las características del plan{' '}
                    <span className="text-white font-bold">{tramo.nombre}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {tramo.operadoresPeru} Operadores Perú
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {tramo.operadoresVenezuela} Operadores Venezuela
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenDemoModal}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  <Zap className="w-4 h-4" />
                  <span>Solicitar plan a la medida</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-2xl font-black font-mono text-purple-300 uppercase tracking-wider">UNLIMITED</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    Tu negocio maneja más de {PLANES[PLANES.length - 1].clientes} clientes -- hablemos de un plan a tu medida, acordado directamente contigo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenDemoModal}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest shadow-xl transition-all duration-300 cursor-pointer font-mono flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  <Zap className="w-4 h-4" />
                  <span>Hablar de mi plan a medida</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
