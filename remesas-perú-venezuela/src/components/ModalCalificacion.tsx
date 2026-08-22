import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, MessageCircle, Send, Smartphone, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  PREGUNTA_OPERA_ACTUALMENTE,
  PREGUNTA_VOLUMEN_MENSUAL,
  PREGUNTA_TIENE_EQUIPO,
  PREGUNTA_URGENCIA,
  OperaActualmente,
  VolumenMensual,
  TieneEquipo,
  Urgencia,
} from '../data/preguntasCalificacion';

interface ModalCalificacionProps {
  isOpen: boolean;
  onClose: () => void;
}

type Paso = 'contacto' | 'preguntas' | 'resultado';

const NUMERO_VENTAS = '51960442025';

function OpcionesRadio<T extends string>({
  pregunta,
  opciones,
  valor,
  onCambiar,
}: {
  pregunta: string;
  opciones: { value: T; label: string }[];
  valor: T | null;
  onCambiar: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase text-slate-400">{pregunta}</label>
      <div className="grid grid-cols-1 gap-2">
        {opciones.map((op) => (
          <button
            key={op.value}
            type="button"
            onClick={() => onCambiar(op.value)}
            className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              valor === op.value
                ? 'bg-blue-600/20 border-blue-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const ModalCalificacion: React.FC<ModalCalificacionProps> = ({ isOpen, onClose }) => {
  const [paso, setPaso] = useState<Paso>('contacto');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [pais, setPais] = useState('peru');

  const [operaActualmente, setOperaActualmente] = useState<OperaActualmente | null>(null);
  const [volumenMensual, setVolumenMensual] = useState<VolumenMensual | null>(null);
  const [tieneEquipo, setTieneEquipo] = useState<TieneEquipo | null>(null);
  const [urgencia, setUrgencia] = useState<Urgencia | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calificado, setCalificado] = useState(false);

  if (!isOpen) return null;

  const preguntasCompletas = !!operaActualmente && !!volumenMensual && !!tieneEquipo && !!urgencia;

  const cerrarYReiniciar = () => {
    onClose();
    setPaso('contacto');
    setNombre('');
    setTelefono('');
    setEmail('');
    setPais('peru');
    setOperaActualmente(null);
    setVolumenMensual(null);
    setTieneEquipo(null);
    setUrgencia(null);
    setError(null);
    setCalificado(false);
  };

  // El submit del <form> del paso 2 solo existe para que Enter no dispare
  // nada raro (los botones de opciones y "Finalizar" son type="button" con
  // su propio onClick) -- se ignora a propósito.
  const evitarSubmitAccidental = (e: React.FormEvent) => e.preventDefault();

  const irAPreguntas = (e: React.FormEvent) => {
    e.preventDefault();
    setPaso('preguntas');
  };

  const finalizar = async () => {
    if (!preguntasCompletas) return;
    setEnviando(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('registrar_prospecto', {
      p_nombre: nombre,
      p_telefono: telefono,
      p_email: email,
      p_pais: pais,
      p_opera_actualmente: operaActualmente,
      p_volumen_mensual: volumenMensual,
      p_tiene_equipo: tieneEquipo,
      p_urgencia: urgencia,
    });
    setEnviando(false);
    if (rpcError || !data?.ok) {
      setError(rpcError?.message ?? data?.error ?? 'No se pudo registrar tu solicitud. Escríbenos por WhatsApp.');
      return;
    }
    setCalificado(!!data.calificado);
    setPaso('resultado');
  };

  const mensajeWhatsApp = encodeURIComponent(
    calificado
      ? `Hola! Completé el cuestionario y quiero mi acceso DEMO gratis de 7 días. Nombre: ${nombre}. Teléfono: ${telefono}. Email: ${email}.`
      : `Hola! Completé el cuestionario de Remesas PERÚ-VENEZUELA y quisiera que un asesor me cuente más. Nombre: ${nombre}. Teléfono: ${telefono}. Email: ${email}.`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={cerrarYReiniciar}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {paso !== 'resultado' && (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs uppercase tracking-wider font-mono">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Paso {paso === 'contacto' ? '1' : '2'} de 2 · Acceso DEMO 7 días gratis</span>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase">
              {paso === 'contacto' ? (
                <>
                  Solicitar <span className="text-blue-500">Demo</span>
                </>
              ) : (
                <>
                  Cuéntanos de tu <span className="text-blue-500">negocio</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {paso === 'contacto'
                ? 'Completa tus datos para continuar.'
                : 'Con esto te preparamos el acceso ideal para tu negocio.'}
            </p>
          </div>
        )}

        {paso === 'contacto' && (
          <form onSubmit={irAPreguntas} className="space-y-4 font-mono">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                placeholder="Ej. José Alfredo Silva"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
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
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Ubicación Principal</label>
                <select
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
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

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {paso === 'preguntas' && (
          <form onSubmit={evitarSubmitAccidental} className="space-y-5 font-mono">
            <OpcionesRadio
              pregunta="¿Cuál es tu situación hoy?"
              opciones={PREGUNTA_OPERA_ACTUALMENTE}
              valor={operaActualmente}
              onCambiar={setOperaActualmente}
            />
            <OpcionesRadio
              pregunta="¿Cuántos clientes/envíos manejas o esperas manejar al mes?"
              opciones={PREGUNTA_VOLUMEN_MENSUAL}
              valor={volumenMensual}
              onCambiar={setVolumenMensual}
            />
            <OpcionesRadio
              pregunta="¿Tienes equipo en Perú y/o Venezuela?"
              opciones={PREGUNTA_TIENE_EQUIPO}
              valor={tieneEquipo}
              onCambiar={setTieneEquipo}
            />
            <OpcionesRadio
              pregunta="¿Qué tan pronto quieres empezar?"
              opciones={PREGUNTA_URGENCIA}
              valor={urgencia}
              onCambiar={setUrgencia}
            />

            {error && <p className="text-rose-400 text-xs">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaso('contacto')}
                className="py-3.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={finalizar}
                disabled={!preguntasCompletas || enviando}
                className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{enviando ? 'Enviando...' : 'Finalizar y ver mi acceso'}</span>
              </button>
            </div>
          </form>
        )}

        {paso === 'resultado' && (
          <div className="text-center py-6 space-y-4">
            {calificado ? (
              <>
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                <h4 className="text-xl font-bold text-white">¡Calificas para tu DEMO gratis de 7 días!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Gracias, <span className="text-blue-400 font-bold">{nombre}</span>. Un asesor te escribirá en breve para activarte el acceso.
                  Si quieres adelantarlo, escríbenos directo:
                </p>
              </>
            ) : (
              <>
                <Clock className="w-16 h-16 text-blue-400 mx-auto" />
                <h4 className="text-xl font-bold text-white">¡Gracias por tu interés, {nombre}!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Registramos tus datos. Un asesor te contactará para conocer mejor tu negocio y ver cómo la plataforma puede ayudarte.
                  Si prefieres, escríbenos ahora mismo:
                </p>
              </>
            )}
            <div className="pt-2">
              <a
                href={`https://wa.me/${NUMERO_VENTAS}?text=${mensajeWhatsApp}`}
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
