import React from 'react';
import { motion } from 'motion/react';
import { Check, X, ShieldAlert, Sparkles, Zap } from 'lucide-react';

export const ComparisonTable: React.FC = () => {
  return (
    <section id="comparison" className="py-24 px-4 bg-slate-950 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider shadow-lg shadow-blue-500/10">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Comparativa Directa</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-wide">
            Caos vs <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">Eficiencia</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Descubre por qué las casas de cambio modernas están migrating del registro tradicional a la plataforma digital automatizada.
          </p>
        </motion.div>

        {/* Comparison Table Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md glow-card-blue shimmer-effect p-4 sm:p-0 card-beam-highlight info-card-interactive"
        >
          {/* Mobile Stacked View (Centered & No Horizontal Scroll) */}
          <div className="sm:hidden space-y-4">
            {[
              {
                trad: 'Registro en Papel / Excel Disperso',
                digi: 'Cloud 24/7 en Tiempo Real con Acceso Móvil'
              },
              {
                trad: 'Error Humano Frecuente (5% - 10% de fuga)',
                digi: '0.001% Error Rate (Cálculo Matemático Automatizado)'
              },
              {
                trad: 'Cierre Diario Lento (hasta 3 horas de arqueo)',
                digi: 'Cierre Instantáneo en 1 Clic con Reporte PDF y Excel'
              },
              {
                trad: 'Notificaciones manuales una a una por chat',
                digi: 'Bot de Telegram (@RemesasPV_bot) + WhatsApp 1-Clic'
              },
              {
                trad: 'Riesgo de desacuerdos entre operadores PE/VE',
                digi: 'Sincronización Transparente Perú ↔ Venezuela en Segundos'
              }
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                {/* Traditional */}
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-slate-300 text-xs flex items-start gap-2.5">
                  <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-mono font-bold text-rose-400 uppercase block mb-0.5">MÉTODO TRADICIONAL</span>
                    <span>{item.trad}</span>
                  </div>
                </div>

                {/* Digital Remesas PE-VE */}
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase block mb-0.5 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400" /> REMESAS PERÚ-VENEZUELA
                    </span>
                    <span>{item.digi}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto scrollbar-thin scrollbar-thumb-blue-500/40">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800/80 font-mono">
                  <th className="p-6 text-xs font-bold uppercase tracking-wider text-rose-400/90 w-1/3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>MÉTODO TRADICIONAL</span>
                    </div>
                  </th>
                  <th className="p-6 text-xs font-bold uppercase tracking-wider text-cyan-400 w-2/3 bg-slate-900/90 border-l border-slate-800">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>REMESAS PERÚ-VENEZUELA (DIGITAL & AUTOMATIZADA)</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {/* Row 1 */}
                <tr className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-5 text-slate-400 flex items-center gap-3">
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Registro en Papel / Excel Disperso</span>
                  </td>
                  <td className="p-5 text-emerald-400 font-bold bg-slate-900/80 border-l border-slate-800 group-hover:bg-emerald-950/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Cloud 24/7 en Tiempo Real con Acceso Móvil</span>
                    </div>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-5 text-slate-400 flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Error Humano Frecuente (5% - 10% de fuga)</span>
                  </td>
                  <td className="p-5 text-emerald-400 font-bold bg-slate-900/80 border-l border-slate-800 group-hover:bg-emerald-950/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>0.001% Error Rate (Cálculo Matemático Automatizado)</span>
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-5 text-slate-400 flex items-center gap-3">
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Cierre Diario Lento (hasta 3 horas de arqueo)</span>
                  </td>
                  <td className="p-5 text-emerald-400 font-bold bg-slate-900/80 border-l border-slate-800 group-hover:bg-emerald-950/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Cierre Instantáneo en 1 Clic con Reporte PDF y Excel</span>
                    </div>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-5 text-slate-400 flex items-center gap-3">
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Notificaciones manuales una a una por chat</span>
                  </td>
                  <td className="p-5 text-emerald-400 font-bold bg-slate-900/80 border-l border-slate-800 group-hover:bg-emerald-950/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Bot de Telegram (@RemesasPV_bot) + WhatsApp 1-Clic</span>
                    </div>
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-5 text-slate-400 flex items-center gap-3">
                    <X className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Riesgo de desacuerdos entre operadores PE/VE</span>
                  </td>
                  <td className="p-5 text-emerald-400 font-bold bg-slate-900/80 border-l border-slate-800 group-hover:bg-emerald-950/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Sincronización Transparente Perú ↔ Venezuela en Segundos</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

