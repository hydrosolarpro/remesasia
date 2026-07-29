import React, { useState } from 'react';
import { RemittanceOrder } from '../types';
import { Send, X, CheckCircle2, Bell, Sparkles, Volume2, ShieldCheck, Smartphone } from 'lucide-react';

interface TelegramSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: RemittanceOrder | null;
}

export const TelegramSimulatorModal: React.FC<TelegramSimulatorModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const [recipientName, setRecipientName] = useState(order ? order.recipientName : 'Mamá (Soraida)');
  const [recipientPhone, setRecipientPhone] = useState(order ? order.recipientPhone : '+58 412 888 1234');
  const [amountVES, setAmountVES] = useState(order ? order.amountVES : 1125);
  const [amountPEN, setAmountPEN] = useState(order ? order.amountPEN : 100);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  if (!isOpen) return null;

  // Web Audio synth for authentic notification sound
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio fallback
    }
  };

  const handleTestTrigger = () => {
    setIsAlerting(true);
    setAlertSent(false);

    setTimeout(() => {
      playNotificationSound();
      setIsAlerting(false);
      setAlertSent(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#002045] border border-[#1a365d] p-6 sm:p-8 text-white shadow-2xl">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#142742] text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-semibold">
            <Send className="w-3.5 h-3.5" />
            SIMULADOR INTERACTIVO DE AVISO TELEGRAM
          </div>
          <h3 className="text-2xl font-bold font-montserrat">Prueba cómo llega el mensaje</h3>
          <p className="text-xs text-slate-300">
            Comprueba la experiencia que vivirá tu familiar en su teléfono cuando reciba la confirmación oficial.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4 mb-6 bg-[#0b1c30] p-4 rounded-2xl border border-[#1a365d]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nombre del Familiar</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#002045] border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Teléfono Telegram (+58)</label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#002045] border border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs pt-1 text-slate-300">
            <span>Monto en Soles: <strong>S/ {amountPEN}</strong></span>
            <span>Monto en Bolívares: <strong className="text-[#2dd4bf]">Bs {amountVES.toLocaleString('es-VE')}</strong></span>
          </div>
        </div>

        {/* Trigger Button */}
        <button
          onClick={handleTestTrigger}
          disabled={isAlerting}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 mb-6"
        >
          {isAlerting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Procesando notificación en servidor...
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              ¡Enviar Prueba de Alerta Telegram Ahora!
            </>
          )}
        </button>

        {/* Realistic Telegram Banner Screen Display */}
        <div className="relative p-6 rounded-2xl bg-gradient-to-b from-[#0d3b66] to-[#07182b] border-2 border-sky-400/50 shadow-2xl overflow-hidden">
          <div className="text-[10px] text-sky-300 font-bold uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>PANTALLA DEL TELÉFONO DE {recipientName.toUpperCase()}</span>
            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> Telegram Oficial</span>
          </div>

          {/* Telegram Notification Card */}
          <div
            className={`p-4 rounded-2xl bg-[#0a2540] border border-sky-400/60 shadow-2xl transition-all duration-500 ${
              alertSent ? 'scale-102 ring-2 ring-sky-300 shadow-sky-500/30' : 'opacity-80'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-300 flex items-center justify-center shrink-0 shadow-md">
                <Send className="w-5 h-5 text-[#002045] fill-current -ml-0.5" />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-montserrat">
                    ¡Transferencia recibida!
                  </h4>
                  <span className="text-[10px] text-sky-300 font-mono">Ahora</span>
                </div>

                <p className="text-xs text-slate-200">
                  Tu familiar ya cuenta con el dinero.
                </p>

                <div className="pt-2 text-[11px] text-slate-300 space-y-0.5 font-mono bg-[#001024]/70 p-2.5 rounded-lg border border-slate-700/60">
                  <div>👤 Para: <strong>{recipientName}</strong></div>
                  <div>💵 Monto acreditado: <strong className="text-[#2dd4bf]">Bs {amountVES.toLocaleString('es-VE')}</strong></div>
                  <div>🏛️ Banco: <strong>Pago Móvil Interbancario</strong></div>
                  <div>🔖 Ref Pago Móvil: <strong>#PM-{Math.floor(100000 + Math.random() * 900000)}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {alertSent && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ¡Notificación entregada en 0.2 segundos! Sin tener que responder WhatsApp.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
