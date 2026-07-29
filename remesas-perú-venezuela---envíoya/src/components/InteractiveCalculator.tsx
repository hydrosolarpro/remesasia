import React, { useState, useEffect } from 'react';
import {
  CURRENT_EXCHANGE_RATE,
  PERU_PAYMENT_METHODS,
  VENEZUELA_BANKS,
} from '../data/appData';
import { RemittanceOrder } from '../types';
import {
  Calculator,
  Lock,
  Clock,
  ArrowRight,
  Zap,
  ShieldCheck,
  Building,
  Smartphone,
  Send,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface InteractiveCalculatorProps {
  onOrderCreated: (order: RemittanceOrder) => void;
}

export const InteractiveCalculator: React.FC<InteractiveCalculatorProps> = ({
  onOrderCreated,
}) => {
  const [amountPEN, setAmountPEN] = useState<number>(100);
  const [selectedPayment, setSelectedPayment] = useState<string>('yape');
  const [selectedBank, setSelectedBank] = useState<string>('pago_movil');
  const [senderName, setSenderName] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientDocument, setRecipientDocument] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  
  // Rate lock timer state (15 minutes)
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 15 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const amountVES = amountPEN * CURRENT_EXCHANGE_RATE;

  const handleQuickAmount = (val: number) => {
    setAmountPEN(val);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const bankObj = VENEZUELA_BANKS.find((b) => b.id === selectedBank);
    const newOrder: RemittanceOrder = {
      id: `PEVE-${Math.floor(100000 + Math.random() * 900000)}`,
      senderName: senderName || 'Remitente en Perú',
      senderPhone: '+51 987 654 321',
      recipientName: recipientName || 'Familiar en Venezuela',
      recipientDocument: recipientDocument || 'V-19.823.412',
      recipientPhone: recipientPhone || '+58 412 555 9988',
      recipientBank: bankObj ? bankObj.name : 'Pago Móvil Interbancario',
      amountPEN,
      amountVES,
      exchangeRate: CURRENT_EXCHANGE_RATE,
      paymentMethod: selectedPayment.toUpperCase(),
      status: 'verifying',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      telegramNotificationSent: true,
    };

    onOrderCreated(newOrder);
  };

  return (
    <section id="calculadora" className="py-16 sm:py-24 bg-[#002045] text-white relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#2dd4bf]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#142742] border border-[#2dd4bf]/30 text-xs font-semibold text-[#2dd4bf]">
            <Calculator className="w-3.5 h-3.5" />
            CALCULADORA DE TASA EN TIEMPO REAL
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-montserrat tracking-tight">
            Envía Soles, Tu Familiar Recibe Bolívares
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Calcula tu remesa con la tasa transparente del día. Sin comisiones ocultas y con aviso automático por Telegram.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Calculator Form */}
          <div className="lg:col-span-12 rounded-3xl bg-[#0b1c30] p-6 sm:p-10 border border-[#1a365d] shadow-2xl space-y-8">
            
            {/* Rate Guarantee Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#142742] border border-[#2dd4bf]/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#2dd4bf]/10 text-[#2dd4bf]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Tasa del Día Garantizada</div>
                  <div className="text-base sm:text-lg font-bold text-white font-montserrat flex items-center gap-2">
                    1 PEN = <span className="text-[#2dd4bf]">{CURRENT_EXCHANGE_RATE} VES</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#002045] text-xs text-slate-300 border border-slate-700">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Tasa congelada por: <strong className="text-amber-300 font-mono text-sm">{formatTimer(secondsLeft)}</strong></span>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-8">
              
              {/* Amounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Send Field (PEN) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-200">
                    Tú envías (Soles - PEN)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={amountPEN}
                      onChange={(e) => setAmountPEN(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-12 pr-20 py-4 bg-[#002045] border-2 border-[#1a365d] focus:border-[#2dd4bf] rounded-2xl text-2xl font-bold text-white outline-none transition-all font-montserrat"
                      required
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
                      S/
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#142742] text-xs font-bold text-[#2dd4bf]">
                      <span>🇵🇪 PEN</span>
                    </div>
                  </div>

                  {/* Quick Select Pills */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400">Rápido:</span>
                    {[50, 100, 200, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickAmount(val)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          amountPEN === val
                            ? 'bg-[#2dd4bf] text-[#002045]'
                            : 'bg-[#142742] text-slate-300 hover:bg-[#1a365d]'
                        }`}
                      >
                        S/ {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Receive Field (VES) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-200">
                    Tu familiar recibe (Bolívares - VES)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={amountVES.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      className="w-full pl-12 pr-20 py-4 bg-[#001024] border-2 border-[#2dd4bf]/50 rounded-2xl text-2xl font-bold text-[#2dd4bf] outline-none font-montserrat cursor-not-allowed shadow-inner"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#2dd4bf] text-lg">
                      Bs
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#002045] text-xs font-bold text-amber-300 border border-amber-400/30">
                      <span>🇻🇪 VES</span>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-400 flex items-center gap-1 pt-1">
                    <Zap className="w-3.5 h-3.5" /> Pago Móvil Directo en Venezuela sin costo extra
                  </p>
                </div>

              </div>

              {/* Payment Methods in Peru & Receiver Bank */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Payment Method Peru */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-200">
                    1. ¿Cómo vas a pagar en Perú?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PERU_PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPayment(method.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          selectedPayment === method.id
                            ? 'bg-[#142742] border-[#2dd4bf] text-white ring-2 ring-[#2dd4bf]/30'
                            : 'bg-[#002045] border-[#1a365d] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span className="font-bold text-sm">{method.name}</span>
                        {method.badge && (
                          <span className="text-[10px] text-[#2dd4bf] font-medium pt-1">
                            {method.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Receiver Bank Venezuela */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-200">
                    2. Banco destino en Venezuela
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full py-3.5 px-4 bg-[#002045] border-2 border-[#1a365d] focus:border-[#2dd4bf] rounded-xl text-sm font-medium text-white outline-none"
                  >
                    {VENEZUELA_BANKS.map((bank) => (
                      <option key={bank.id} value={bank.id} className="bg-[#002045]">
                        {bank.name} {bank.code !== 'PAGO_MOVIL' ? `(${bank.code})` : ''}
                      </option>
                    ))}
                  </select>

                  <div className="p-3 rounded-xl bg-[#002045]/60 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#2dd4bf] shrink-0" />
                    <span>Acreditación inmediata vía Pago Móvil Interbancario 24/7.</span>
                  </div>
                </div>

              </div>

              {/* Recipient Details Section */}
              <div className="space-y-4 pt-4 border-t border-[#1a365d]">
                <h3 className="text-base font-bold text-white font-montserrat flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#2dd4bf]" />
                  3. Datos del Familiar para Aviso Automático Telegram / WhatsApp
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nombre del Familiar
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Carmen Rodríguez"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#002045] border border-[#1a365d] focus:border-[#2dd4bf] rounded-xl text-sm text-white outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cédula o RIF Venezuela
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. V-18.492.301"
                      value={recipientDocument}
                      onChange={(e) => setRecipientDocument(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#002045] border border-[#1a365d] focus:border-[#2dd4bf] rounded-xl text-sm text-white outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Teléfono Telegram / Pago Móvil (+58)
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. +58 412 890 1234"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#002045] border border-[#1a365d] focus:border-[#2dd4bf] rounded-xl text-sm text-white outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex flex-col items-center gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-[#2dd4bf] to-[#22b8a3] hover:from-[#22b8a3] hover:to-[#006b5f] text-[#002045] font-black text-lg shadow-xl shadow-[#2dd4bf]/25 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="w-6 h-6 fill-current" />
                  Iniciar Envío de S/ {amountPEN} ➔ Bs {amountVES.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                </button>

                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />
                  Aviso automático oficial por Telegram incluido sin costos adicionales.
                </p>
              </div>

            </form>

          </div>

        </div>

      </div>
    </section>
  );
};
