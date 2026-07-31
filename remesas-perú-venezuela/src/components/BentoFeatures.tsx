import React from 'react';
import { motion } from 'motion/react';
import {
  Smartphone,
  Users,
  RefreshCw,
  Sliders,
  ClipboardList,
  Bell,
  Bot,
  Link,
  BarChart3,
  Send,
  FileSpreadsheet,
  Headphones,
  Zap,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  const primaryFeatures = [
    {
      num: '01',
      title: 'Plataforma Digital Atractiva & Colaborativa',
      description: 'Plataforma digital en línea atractiva, colaborativa entre clientes y operadores, fácil uso y adecuada para el manejo con smartphone con respaldo de base de datos y seguridad cibernética.',
      icon: Smartphone,
      accent: 'from-blue-500/20 to-cyan-500/10',
      borderHover: 'group-hover:border-blue-500/60',
      iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      badgeGlow: 'shadow-blue-500/20'
    },
    {
      num: '02',
      title: 'Registro de Clientes & Contador de Cupos',
      description: 'Registro de datos de clientes finales con contador de cupos disponibles según registro de clientes de forma automática y con opción a búsqueda de clientes.',
      icon: Users,
      accent: 'from-emerald-500/20 to-teal-500/10',
      borderHover: 'group-hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      badgeGlow: 'shadow-emerald-500/20'
    },
    {
      num: '03',
      title: 'Sincronización Instantánea PE ↔ VE',
      description: 'Información de las solicitudes del cliente compartidas de forma automática e instantánea entre operadores en Perú y los operadores en Venezuela.',
      icon: RefreshCw,
      accent: 'from-cyan-500/20 to-blue-500/10',
      borderHover: 'group-hover:border-cyan-500/60',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
      badgeGlow: 'shadow-cyan-500/20'
    },
    {
      num: '04',
      title: 'Gestión Integral de Datos del Negocio',
      description: 'Datos importantes para la gestión del negocio: Nombre, Logo, eslogan, datos personales (nombre y teléfono, correo), datos de plataformas digitales de transferencia de la moneda de recepción, datos de cuentas bancarias, registro de los operadores, horario de atención, tasa de la moneda de Perú/Venezuela, % de rentabilidad y ganancia por operación y total de operaciones.',
      icon: Sliders,
      accent: 'from-purple-500/20 to-indigo-500/10',
      borderHover: 'group-hover:border-purple-500/60',
      iconBg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
      badgeGlow: 'shadow-purple-500/20'
    },
    {
      num: '05',
      title: 'Listado de Operaciones & Validación en 2 Pasos',
      description: 'Listado de operaciones para la recepción de solicitudes de los clientes finales con todos los datos requeridos para la transferencia de la remesa, resumen de operaciones, carga de imágenes de depósitos (Perú/Venezuela), lista de operaciones realizadas y de revisión con check de validación de recepción de pago y de validación de los depósitos en el país de entrega de remesa.',
      icon: ClipboardList,
      accent: 'from-emerald-500/20 to-blue-500/10',
      borderHover: 'group-hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      badgeGlow: 'shadow-emerald-500/20'
    },
    {
      num: '06',
      title: 'Información en Tiempo Real & Alarma Sonora',
      description: 'Información automatizada y en tiempo real de indicaciones de fecha y hora de las operaciones, tiempo de respuesta entre operaciones en curso, realizadas, operaciones por revisión para la confirmación de validación de depósito por los clientes y de alarma sonora en las sesiones de operadores (Perú/Venezuela) para la eficiente gestión de las remesas.',
      icon: Bell,
      accent: 'from-amber-500/20 to-orange-500/10',
      borderHover: 'group-hover:border-amber-500/60',
      iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      badgeGlow: 'shadow-amber-500/20'
    },
    {
      num: '07',
      title: 'Respuestas Automáticas WhatsApp & Telegram ChatBot',
      description: 'Respuesta automáticas e inmediatas de las operaciones de remesa a los clientes (Perú/Venezuela) por vía WhatsApp y Telegram ChatBot.',
      icon: Bot,
      accent: 'from-blue-500/20 to-purple-500/10',
      borderHover: 'group-hover:border-blue-500/60',
      iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      badgeGlow: 'shadow-blue-500/20'
    },
    {
      num: '08',
      title: 'Acceso Directo para Operadores por WhatsApp',
      description: 'Respuesta de información de enlaces para el acceso del equipo de operadores (Perú/Venezuela) por vía WhatsApp.',
      icon: Link,
      accent: 'from-emerald-500/20 to-teal-500/10',
      borderHover: 'group-hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      badgeGlow: 'shadow-emerald-500/20'
    },
    {
      num: '09',
      title: 'Estadísticas Avanzadas & Gráficos Interactivos',
      description: 'Resultado de estadísticas: total de operaciones realizadas, total de montos en la moneda de recepción/entrega con su total de Ganancias, resumen de operaciones por operadores (Perú/Venezuela), reporte por día, fecha específica, rango de fechas, mes, rango de meses, año y rango de años, gráficas de las operaciones resultados tipo barra, circular y lineal.',
      icon: BarChart3,
      accent: 'from-indigo-500/20 to-purple-500/10',
      borderHover: 'group-hover:border-indigo-500/60',
      iconBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
      badgeGlow: 'shadow-indigo-500/20'
    },
    {
      num: '10',
      title: 'Landing Page Profesional & Invitaciones Automáticas',
      description: 'Invitaciones automáticas por vía WhatsApp usando una Landing page altamente profesional con todas las funcionalidades y beneficios del servicio para la incorporación de clientes existentes (migración a la plataforma) y nuevas captaciones de clientes en el país de recepción.',
      icon: Send,
      accent: 'from-cyan-500/20 to-blue-500/10',
      borderHover: 'group-hover:border-cyan-500/60',
      iconBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
      badgeGlow: 'shadow-cyan-500/20'
    },
    {
      num: '11',
      title: 'Exportaciones en EXCEL y PDF Completa',
      description: 'Exportaciones en EXCEL y PDF: Descarga de resultado de operaciones según estadísticas seleccionadas con su lista respectiva en formato EXCEL y PDF, descarga de gráficos de estadísticas, descarga de clientes registrados en formato EXCEL y PDF.',
      icon: FileSpreadsheet,
      accent: 'from-emerald-500/20 to-teal-500/10',
      borderHover: 'group-hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      badgeGlow: 'shadow-emerald-500/20'
    },
    {
      num: '12',
      title: 'Soporte Técnico y Asesorías en Línea 24/7',
      description: 'Sin coste adicional e incluye mejoras, modificaciones y adaptaciones a la medida de las necesidades de todos los usuarios.',
      icon: Headphones,
      accent: 'from-blue-500/20 to-indigo-500/10',
      borderHover: 'group-hover:border-blue-500/60',
      iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      badgeGlow: 'shadow-blue-500/20'
    }
  ];

  return (
    <section id="features" className="py-24 px-4 bg-slate-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider shadow-lg shadow-blue-500/10">
            <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>Funcionalidades Principales del Sistema</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-wide">
            Plataforma Integral de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400">Remesas</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Todas las herramientas esenciales diseñadas específicamente para automatizar, controlar y escalar tu negocio de transferencias entre Perú y Venezuela.
          </p>
        </motion.div>

        {/* Primary Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {primaryFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (idx % 6) * 0.08 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className={`p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 ${feat.borderHover} transition-all duration-300 space-y-4 group shadow-xl hover:shadow-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-md shimmer-effect card-beam-highlight info-card-interactive`}
              >
                {/* Hover Glow Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl ${feat.iconBg} border flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-black text-slate-400 group-hover:text-white bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800/80 shadow-inner transition-colors">
                      #{feat.num}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors leading-snug">
                    {feat.title}
                  </h3>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono font-bold text-emerald-400 relative z-10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Incluido en la Plataforma</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


