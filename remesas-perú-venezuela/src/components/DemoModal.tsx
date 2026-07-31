import React, { useState } from 'react';
import { X, Send, Smartphone, CheckCircle, MessageCircle } from 'lucide-react';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('peru');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const whatsappMessage = encodeURIComponent(
    `Hola!, deseo ingresar a la Plaforma Remesas PERÚ-VENEZUELA  con la prueba gratuita por 7 días.${fullName ? ` Nombre: ${fullName}. Teléfono: ${phone}. Email: ${email}` : ''}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs uppercase tracking-wider font-mono">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Acceso Inmediato 7 Días Gratis</span>
          </div>
          <h3 className="text-2xl font-black text-white italic uppercase">
            Solicitar Demo <span className="text-blue-500">Remesas</span>
          </h3>
          <p className="text-xs text-slate-400">
            Completa tus datos para enviarte las credenciales de prueba o conéctate directo con nuestro equipo por WhatsApp.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 font-mono">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej. José Alfredo Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  required
                  placeholder="+51 960 442 025"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Ubicación Principal</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="peru">🇵🇪 Perú</option>
                  <option value="venezuela">🇻🇪 Venezuela</option>
                  <option value="ambos">🇵🇪 🇻🇪 Ambos Países</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="tuempresa@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Confirmar y Enviar Solicitud</span>
              </button>

              <a
                href={`https://wa.me/51960442025?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar por WhatsApp Directo (+51 960 442 025)</span>
              </a>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
            <h4 className="text-xl font-bold text-white">¡Solicitud Registrada con Éxito!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Gracias, <span className="text-blue-400 font-bold">{fullName}</span>. Nuestro equipo de soporte 24/7 procesará tus credenciales de prueba en menos de 5 minutos.
            </p>
            <div className="pt-2">
              <a
                href={`https://wa.me/51960442025?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 font-mono"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Abrir WhatsApp Ahora</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
