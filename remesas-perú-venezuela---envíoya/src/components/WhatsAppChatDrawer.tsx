import React, { useState } from 'react';
import { X, Send, CheckCheck, UserCheck } from 'lucide-react';

interface WhatsAppChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppChatDrawer: React.FC<WhatsAppChatDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState([
    {
      sender: 'operator',
      text: '¡Hola! Soy Carlos, tu operador asignado en Remesas Perú-Venezuela. ¿En qué te puedo ayudar hoy?',
      time: '09:00 AM',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setInputMsg('');

    // Simulated operator auto-response
    setTimeout(() => {
      let reply = 'Con gusto te atiendo. La tasa actual del día se aplica directamente a tus envíos de soles a bolívares soberanos.';
      if (userText.toLowerCase().includes('tasa')) {
        reply = 'La tasa de hoy en Remesas Perú-Venezuela es la tasa oficial del día sin comisiones ocultas.';
      } else if (userText.toLowerCase().includes('banco') || userText.toLowerCase().includes('yape')) {
        reply = 'Aceptamos Yape, Plin, BCP, Interbank y BBVA en Perú. Enviamos por Pago Móvil a todos los bancos en Venezuela.';
      }

      setMessages((prev) => [
        ...prev,
        { sender: 'operator', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-3xl bg-[#0b1c30] border border-[#1a365d] shadow-2xl text-white overflow-hidden flex flex-col h-[520px]">
      
      {/* Header */}
      <div className="bg-[#002045] p-4 border-b border-[#1a365d] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#002045]"></span>
          </div>
          <div>
            <h4 className="font-bold text-sm font-montserrat">Operador Carlos (Atención Humana)</h4>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              ● En línea • Lima - Caracas
            </span>
          </div>
        </div>

        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#142742] text-slate-300">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gradient-to-b from-[#0b1c30] to-[#001024]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col max-w-[85%] ${
              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#2dd4bf] text-[#002045] font-semibold rounded-br-none'
                  : 'bg-[#142742] text-white border border-slate-700/60 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
              {msg.time} {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-[#2dd4bf]" />}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 bg-[#001024] border-t border-[#1a365d] flex gap-2 overflow-x-auto text-[11px]">
        <button
          onClick={() => {
            setInputMsg('¿Cuál es la tasa del día?');
          }}
          className="px-3 py-1 rounded-full bg-[#142742] text-slate-300 hover:text-white shrink-0"
        >
          🧮 ¿Tasa del día?
        </button>
        <button
          onClick={() => {
            setInputMsg('Quiero solicitar un envío de soles a bolívares soberanos');
          }}
          className="px-3 py-1 rounded-full bg-[#2dd4bf]/20 text-[#2dd4bf] hover:bg-[#2dd4bf]/30 shrink-0 font-bold"
        >
          🚀 Solicitar Envío
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#002045] border-t border-[#1a365d] flex gap-2">
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          placeholder="Escribe un mensaje a Carlos..."
          className="flex-1 px-3 py-2 bg-[#0b1c30] border border-[#1a365d] focus:border-[#2dd4bf] rounded-xl text-xs text-white outline-none"
        />
        <button
          type="submit"
          className="p-2 rounded-xl bg-[#2dd4bf] text-[#002045] hover:bg-[#22b8a3]"
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </form>

    </div>
  );
};
