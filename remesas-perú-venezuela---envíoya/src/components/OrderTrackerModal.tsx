import React, { useState } from 'react';
import { RemittanceOrder } from '../types';
import { Search, X, CheckCircle2, Clock, Send, ShieldCheck, Download, ExternalLink } from 'lucide-react';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrder?: RemittanceOrder | null;
  onTriggerTelegramDemo: (order: RemittanceOrder) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen,
  onClose,
  activeOrder,
  onTriggerTelegramDemo,
}) => {
  const [searchCode, setSearchCode] = useState(activeOrder ? activeOrder.id : 'PEVE-984210');
  const [searchedOrder, setSearchedOrder] = useState<RemittanceOrder | null>(
    activeOrder || {
      id: 'PEVE-984210',
      senderName: 'Carlos Mendoza',
      senderPhone: '+51 912 345 678',
      recipientName: 'Soraida de Mendoza',
      recipientDocument: 'V-14.291.802',
      recipientPhone: '+58 412 888 1234',
      recipientBank: 'Banco de Venezuela (Pago Móvil)',
      amountPEN: 150,
      amountVES: 1687.5,
      exchangeRate: 11.25,
      paymentMethod: 'YAPE',
      status: 'completed',
      createdAt: 'Hace 5 minutos',
      telegramNotificationSent: true,
    }
  );

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedOrder({
      id: searchCode.toUpperCase(),
      senderName: 'Usuario EnvíoYa',
      senderPhone: '+51 987 654 321',
      recipientName: 'Familiar en Venezuela',
      recipientDocument: 'V-18.992.110',
      recipientPhone: '+58 414 555 7788',
      recipientBank: 'Banesco (Pago Móvil)',
      amountPEN: 100,
      amountVES: 1125,
      exchangeRate: 11.25,
      paymentMethod: 'PLIN',
      status: 'completed',
      createdAt: 'Reciente',
      telegramNotificationSent: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#002045] border border-[#1a365d] p-6 sm:p-8 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#142742] text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#142742] border border-[#2dd4bf]/30 text-xs font-semibold text-[#2dd4bf]">
            <Search className="w-3.5 h-3.5" />
            RASTREADOR DE OPERACIONES
          </div>
          <h3 className="text-2xl font-bold font-montserrat">Seguimiento en Tiempo Real</h3>
          <p className="text-xs text-slate-300">
            Ingresa tu código de operación (Ej: PEVE-984210) para verificar el estado de entrega y el aviso por Telegram.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Ej. PEVE-984210"
            className="flex-1 px-4 py-3 rounded-xl bg-[#0b1c30] border border-[#1a365d] focus:border-[#2dd4bf] text-sm text-white outline-none font-mono uppercase"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-[#2dd4bf] text-[#002045] font-bold text-xs hover:bg-[#22b8a3] flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
        </form>

        {/* Search Results / Order Details */}
        {searchedOrder && (
          <div className="space-y-6">
            
            {/* Order Card Header */}
            <div className="p-4 rounded-2xl bg-[#0b1c30] border border-[#1a365d] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Código de Envío</span>
                <div className="text-xl font-bold font-mono text-[#2dd4bf]">{searchedOrder.id}</div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Procesado & Notificado</span>
              </div>
            </div>

            {/* Recipient & Amount Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-[#142742]/50 p-4 rounded-2xl border border-slate-700/50">
              <div>
                <span className="text-slate-400 block">Monto Soles</span>
                <strong className="text-base text-white font-montserrat">S/ {searchedOrder.amountPEN}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Monto Bolívares</span>
                <strong className="text-base text-[#2dd4bf] font-montserrat">
                  Bs {searchedOrder.amountVES.toLocaleString('es-VE')}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Tasa Usada</span>
                <strong className="text-white">1 PEN = {searchedOrder.exchangeRate} VES</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Familiar Destino</span>
                <strong className="text-white">{searchedOrder.recipientName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Cédula / ID</span>
                <strong className="text-white">{searchedOrder.recipientDocument}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Banco Destino</span>
                <strong className="text-white">{searchedOrder.recipientBank}</strong>
              </div>
            </div>

            {/* Timeline Progress Stepper */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Línea de Tiempo del Procesamiento
              </h4>

              <div className="space-y-3 pl-2 border-l-2 border-[#2dd4bf]/40">
                
                <div className="relative pl-6">
                  <div className="absolute -left-[17px] top-0.5 w-4 h-4 rounded-full bg-[#2dd4bf] ring-4 ring-[#002045]"></div>
                  <div className="text-sm font-bold text-white">1. Pago Recibido en Perú ({searchedOrder.paymentMethod})</div>
                  <div className="text-xs text-slate-400">Verificado exitosamente por sistema automatizado</div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute -left-[17px] top-0.5 w-4 h-4 rounded-full bg-[#2dd4bf] ring-4 ring-[#002045]"></div>
                  <div className="text-sm font-bold text-white">2. Tasa de Cambio Congelada</div>
                  <div className="text-xs text-slate-400">Garantía de cambio 1 PEN = {searchedOrder.exchangeRate} VES aplicada</div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute -left-[17px] top-0.5 w-4 h-4 rounded-full bg-[#2dd4bf] ring-4 ring-[#002045]"></div>
                  <div className="text-sm font-bold text-white">3. Acreditación Pago Móvil Venezuela</div>
                  <div className="text-xs text-slate-400">Fondos acreditados a {searchedOrder.recipientName}</div>
                </div>

                <div className="relative pl-6">
                  <div className="absolute -left-[17px] top-0.5 w-4 h-4 rounded-full bg-emerald-400 ring-4 ring-[#002045] animate-ping"></div>
                  <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                    <Send className="w-4 h-4" />
                    4. Aviso Oficial Telegram Enviado
                  </div>
                  <div className="text-xs text-emerald-200">
                    Notificación recibida en el celular +58 {searchedOrder.recipientPhone}
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onTriggerTelegramDemo(searchedOrder)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 fill-current" />
                Ver Notificación Telegram de esta Orden
              </button>

              <button
                onClick={() => alert(`Comprobante digital para ${searchedOrder.id} descargado.`)}
                className="py-3.5 px-4 rounded-xl bg-[#142742] hover:bg-[#1a365d] border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-[#2dd4bf]" />
                Descargar Comprobante
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
