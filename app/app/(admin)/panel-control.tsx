import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { RoleTag } from '../../components/RoleTag';
import { RoundCheck } from '../../components/RoundCheck';
import { CalendarioDias } from '../../components/CalendarioFecha';
import {
  DIAS_DEMO,
  ORDEN_PLANES,
  PRECIO_PLAN,
  NOMBRE_PLAN,
  diasRestantesDemo,
  fechaFinPlanPagado,
  obtenerLimiteClientes,
  planDesdeMonto,
  planLabel,
} from '../../lib/plan';
import { PlanOperador } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

const periodoActual = () => new Date().toISOString().slice(0, 7);
const MS_POR_DIA = 86_400_000;

const formatearFechaCorta = (isoFecha: string) => new Date(`${isoFecha}T00:00:00`).toLocaleDateString('es-PE');
const formatearFechaHora = (iso: string) => new Date(iso).toLocaleDateString('es-PE');

interface Pago {
  id: string;
  periodo: string;
  estado: 'pendiente' | 'verificado' | 'rechazado';
  monto: number;
}

interface CambioPendienteFila {
  id: string;
  plan_solicitado: string;
  monto: number;
  estado: 'pendiente' | 'verificado';
}

interface OperadorFila {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  created_at: string;
  acceso_concedido: boolean;
  plan: PlanOperador;
  demo_inicio: string | null;
  plan_inicio: string | null;
  perfil_negocio: { nombre_negocio: string } | null;
  pagos_suscripcion: Pago[];
  totalClientes: number;
  totalVenezuela: number;
  totalEquipoPeru: number;
}

// Plan vigente de un operador: usuarios.plan/plan_inicio ya son la fuente
// de verdad (se actualizan atómicamente al activarse un plan -- ver
// validarPago/guardarMontoUnlimited/admin_validar_cambio_plan). `pagoPeriodo`
// solo se usa para mostrar si hay un comprobante de ESTE mes pendiente de
// verificar. `planMonto` completa el monto acordado para UNLIMITED (no
// tiene precio fijo), tomado del último pago verificado.
function calcularPlanActual(op: OperadorFila) {
  const pagoPeriodo = op.pagos_suscripcion.find((p) => p.periodo === periodoActual());
  const planActual = op.plan;
  const planMonto = planActual === 'unlimited' ? precioPlanOperador(op, planActual) || undefined : undefined;
  return { pagoPeriodo, planActual, planMonto };
}

// Precio mensual que corresponde a un operador según su plan vigente: fijo
// para todos los planes salvo UNLIMITED, que se acuerda caso por caso con
// el administrador (se toma el monto de su último pago verificado).
function precioPlanOperador(op: OperadorFila, planActual: string): number {
  if (planActual === 'unlimited') {
    const verificados = op.pagos_suscripcion
      .filter((p) => p.estado === 'verificado')
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
    return verificados[0]?.monto ?? 0;
  }
  return PRECIO_PLAN[planActual] ?? 0;
}

export default function PanelControl() {
  const [operadores, setOperadores] = useState<OperadorFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [demoExtendido, setDemoExtendido] = useState<Record<string, string>>({});
  const [calendarioDemoAbierto, setCalendarioDemoAbierto] = useState<string | null>(null);
  const [montosUnlimited, setMontosUnlimited] = useState<Record<string, string>>({});
  // Renovación/cambio de plan ya pagado, todavía sin activarse -- a lo
  // más uno abierto por operador (ver cambios_plan_pendientes).
  const [cambiosPendientes, setCambiosPendientes] = useState<Record<string, CambioPendienteFila>>({});
  const [procesandoCambio, setProcesandoCambio] = useState<string | null>(null);

  // Eliminar operador (borrado físico irreversible, ver
  // supabase/functions/eliminar-operador-peru): el panel de confirmación
  // solo se abre para UN operador a la vez, y el botón final queda
  // deshabilitado hasta que el admin teclee exactamente su correo --
  // salvaguarda extra para no borrar el negocio equivocado de un clic.
  const [eliminandoOperadorId, setEliminandoOperadorId] = useState<string | null>(null);
  const [confirmacionEmail, setConfirmacionEmail] = useState<Record<string, string>>({});
  const [eliminando, setEliminando] = useState(false);

  // `silencioso` evita el parpadeo de pantalla completa a "cargando" en
  // los refrescos automáticos de fondo (ver polling de 8s más abajo) --
  // solo se muestra el spinner de pantalla completa en la carga inicial.
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select(
        'id, nombre, email, telefono, created_at, acceso_concedido, plan, demo_inicio, plan_inicio, perfil_negocio(nombre_negocio), pagos_suscripcion!pagos_suscripcion_operador_peru_id_fkey(id, periodo, estado, monto)'
      )
      .eq('rol', 'operador_peru')
      .order('created_at', { ascending: false });
    if (error) console.error('Error cargando operadores:', error.message);

    const { data: cambios } = await supabase
      .from('cambios_plan_pendientes')
      .select('id, operador_peru_id, plan_solicitado, monto, estado')
      .neq('estado', 'rechazado')
      .is('activado_at', null);
    const mapaCambios: Record<string, CambioPendienteFila> = {};
    (cambios ?? []).forEach((c) => {
      mapaCambios[c.operador_peru_id] = { id: c.id, plan_solicitado: c.plan_solicitado, monto: c.monto, estado: c.estado as 'pendiente' | 'verificado' };
    });
    setCambiosPendientes(mapaCambios);

    const { data: clientes } = await supabase
      .from('usuarios')
      .select('negocio_operador_peru_id')
      .eq('rol', 'cliente')
      .is('eliminado_at', null);
    const conteoClientes: Record<string, number> = {};
    (clientes ?? []).forEach((c) => {
      if (c.negocio_operador_peru_id) {
        conteoClientes[c.negocio_operador_peru_id] = (conteoClientes[c.negocio_operador_peru_id] ?? 0) + 1;
      }
    });

    const { data: venezuela } = await supabase
      .from('operador_venezuela_perfil')
      .select('operador_peru_id');
    const conteoVe: Record<string, number> = {};
    (venezuela ?? []).forEach((v) => {
      conteoVe[v.operador_peru_id] = (conteoVe[v.operador_peru_id] ?? 0) + 1;
    });

    const { data: miembros } = await supabase
      .from('operador_peru_miembro')
      .select('operador_peru_id');
    const conteoPe: Record<string, number> = {};
    (miembros ?? []).forEach((m) => {
      conteoPe[m.operador_peru_id] = (conteoPe[m.operador_peru_id] ?? 0) + 1;
    });

    setOperadores(
      ((data as unknown as OperadorFila[] | null) ?? []).map((op) => ({
        ...op,
        totalClientes: conteoClientes[op.id] ?? 0,
        totalVenezuela: conteoVe[op.id] ?? 0,
        totalEquipoPeru: conteoPe[op.id] ?? 0,
      }))
    );
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // Auto-actualización cada 5s: para que el admin vea sin recargar los
  // nuevos pagos por verificar, cambios de plan, etc.
  useEffect(() => {
    const id = setInterval(() => cargar(true), 5_000);
    return () => clearInterval(id);
  }, [cargar]);

  const validarPago = async (pagoId: string, operadorId: string, monto: number) => {
    setProcesando(pagoId);
    const { data: usuarioAuth } = await supabase.auth.getUser();
    const { error: errorPago } = await supabase
      .from('pagos_suscripcion')
      .update({ estado: 'verificado', verificado_por: usuarioAuth.user?.id, verificado_at: new Date().toISOString() })
      .eq('id', pagoId);
    if (errorPago) {
      setProcesando(null);
      Alert.alert('No se pudo validar el pago', errorPago.message);
      return;
    }
    const plan = planDesdeMonto(monto);
    const { error: errorPlan } = await supabase
      .from('usuarios')
      .update({ plan, acceso_concedido: true, plan_inicio: new Date().toISOString() })
      .eq('id', operadorId);
    setProcesando(null);
    if (errorPlan) {
      // El pago ya quedó marcado como verificado, pero el plan del
      // operador no se actualizó -- avisamos para que el admin reintente
      // en vez de creer que ya quedó todo listo.
      Alert.alert('Pago verificado, pero no se pudo actualizar el plan', errorPlan.message);
    }
    cargar();
  };

  const concederAcceso = async (operadorId: string) => {
    setProcesando(operadorId);
    const { error } = await supabase.from('usuarios').update({ acceso_concedido: true }).eq('id', operadorId);
    setProcesando(null);
    if (error) {
      Alert.alert('No se pudo conceder el acceso', error.message);
      return;
    }
    cargar();
  };

  // El admin elige libremente la fecha de vencimiento del DEMO en el
  // calendario; como demo_inicio + DIAS_DEMO define ese vencimiento (ver
  // fechaFinDemo en lib/plan), para lograr la fecha elegida hay que
  // "retrofechar" demo_inicio en consecuencia.
  const extenderDemo = async (operadorId: string, fechaFin: string) => {
    setProcesando(`${operadorId}_ext`);
    const finMs = new Date(`${fechaFin}T00:00:00`).getTime();
    const demoInicioNuevo = new Date(finMs - DIAS_DEMO * MS_POR_DIA).toISOString();
    const { error } = await supabase.from('usuarios').update({ demo_inicio: demoInicioNuevo }).eq('id', operadorId);
    setProcesando(null);
    if (error) {
      Alert.alert('No se pudo extender el DEMO', error.message);
      return;
    }
    setDemoExtendido((prev) => ({ ...prev, [operadorId]: fechaFin }));
    setCalendarioDemoAbierto(null);
    cargar();
  };

  const guardarMontoUnlimited = async (operadorId: string) => {
    const monto = parseFloat(montosUnlimited[operadorId]);
    if (!monto || monto <= 0) return;
    setProcesando(`${operadorId}_unlimited`);
    const { data: usuarioAuth } = await supabase.auth.getUser();
    const periodo = periodoActual();
    const { data: existente } = await supabase
      .from('pagos_suscripcion')
      .select('id')
      .eq('operador_peru_id', operadorId)
      .eq('periodo', periodo)
      .maybeSingle();
    const { error: errorPago } = existente
      ? await supabase
          .from('pagos_suscripcion')
          .update({ monto, estado: 'verificado', verificado_por: usuarioAuth.user?.id, verificado_at: new Date().toISOString() })
          .eq('id', existente.id)
      : await supabase.from('pagos_suscripcion').insert({
          operador_peru_id: operadorId,
          periodo,
          monto,
          estado: 'verificado',
          verificado_por: usuarioAuth.user?.id,
          verificado_at: new Date().toISOString(),
        });
    if (errorPago) {
      setProcesando(null);
      Alert.alert('No se pudo fijar el monto UNLIMITED', errorPago.message);
      return;
    }
    const { error: errorPlan } = await supabase
      .from('usuarios')
      .update({ plan: 'unlimited', acceso_concedido: true, plan_inicio: new Date().toISOString() })
      .eq('id', operadorId);
    setProcesando(null);
    if (errorPlan) {
      Alert.alert('Monto guardado, pero no se pudo activar el plan UNLIMITED', errorPlan.message);
    }
    setMontosUnlimited((prev) => ({ ...prev, [operadorId]: '' }));
    cargar();
  };

  // Renovación/cambio de plan pagado por adelantado: admin_validar_cambio_plan
  // decide sola si se activa de inmediato (sin ciclo pagado vigente) o
  // queda en espera hasta que termine el ciclo actual -- ver la migración
  // de ciclo_30_dias_planes.
  const validarCambioPlan = async (cambioId: string) => {
    setProcesandoCambio(cambioId);
    const { data, error } = await supabase.rpc('admin_validar_cambio_plan', { p_cambio_id: cambioId });
    setProcesandoCambio(null);
    if (error) {
      Alert.alert('No se pudo validar el cambio de plan', error.message);
      return;
    }
    if (data && !data.ok) {
      Alert.alert('No se pudo validar el cambio de plan', data.error ?? 'Error desconocido.');
      return;
    }
    cargar();
  };

  const rechazarCambioPlan = async (cambioId: string) => {
    setProcesandoCambio(cambioId);
    const { error } = await supabase.from('cambios_plan_pendientes').update({ estado: 'rechazado' }).eq('id', cambioId);
    setProcesandoCambio(null);
    if (error) {
      Alert.alert('No se pudo rechazar el cambio de plan', error.message);
      return;
    }
    cargar();
  };

  // Borrado físico e irreversible de un Operador principal de Perú y todo
  // su negocio (equipo de Perú, operadores de Venezuela y clientes). El
  // historial de operaciones y de pagos de suscripción se conserva (ver
  // supabase/migrations/0078_eliminar_operador_peru.sql).
  const eliminarOperador = async (op: OperadorFila) => {
    setEliminando(true);
    const { data, error } = await supabase.functions.invoke('eliminar-operador-peru', { body: { operador_id: op.id } });
    setEliminando(false);
    // Igual que en (operador-peru)/clientes.tsx: cuando la función responde
    // con status distinto de 2xx, el mensaje real viaja en `error.context`,
    // no en `error.message`.
    let mensajeError: string | null = null;
    if (error) {
      mensajeError = error.message;
      const contexto = (error as { context?: unknown }).context;
      if (contexto instanceof Response) {
        try {
          const cuerpo = await contexto.json();
          if (cuerpo?.error) mensajeError = cuerpo.error;
        } catch {
          // Respuesta sin JSON válido: se mantiene error.message.
        }
      } else if ((data as { error?: string } | null)?.error) {
        mensajeError = (data as { error: string }).error;
      }
    }
    if (mensajeError) {
      // Alert.alert no muestra nada en web (RN Web no lo implementa) --
      // ver el mismo workaround en (operador-peru)/clientes.tsx.
      if (Platform.OS === 'web') window.alert(mensajeError);
      else Alert.alert('No se pudo eliminar el operador', mensajeError);
      return;
    }
    setEliminandoOperadorId(null);
    setConfirmacionEmail((prev) => ({ ...prev, [op.id]: '' }));
    cargar();
  };

  const totalOperadores = operadores.length;
  const totalClientesGlobal = operadores.reduce((acc, op) => acc + op.totalClientes, 0);
  const totalVenezuelaGlobal = operadores.reduce((acc, op) => acc + op.totalVenezuela, 0);

  // Ganancia Bruta: para cada operador con acceso concedido, se toma el
  // precio de su plan vigente (STARTER/PRO/EXPERT/AVANCE/ULTRA fijados por
  // el administrador en lib/plan, o el monto acordado para UNLIMITED) y se
  // suman todos los operadores agrupados por plan.
  const desglosePorPlan: Record<string, { cantidad: number; subtotal: number }> = {};
  operadores
    .filter((op) => op.acceso_concedido)
    .forEach((op) => {
      const { planActual } = calcularPlanActual(op);
      const precio = precioPlanOperador(op, planActual);
      const fila = desglosePorPlan[planActual] ?? { cantidad: 0, subtotal: 0 };
      fila.cantidad += 1;
      fila.subtotal += precio;
      desglosePorPlan[planActual] = fila;
    });
  const gananciaBruta = Object.values(desglosePorPlan).reduce((acc, fila) => acc + fila.subtotal, 0);

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol="administrador" />
      <Text style={styles.titulo}>Panel de control</Text>

      <View style={[styles.resumen, cardShadow]}>
        <Text style={styles.resumenTitulo}>Resumen de estadísticas de clientes (Operadores de Perú)</Text>
        <View style={styles.resumenFila}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>Total operadores</Text>
            <Text style={styles.resumenValor}>{totalOperadores}</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>Total clientes</Text>
            <Text style={styles.resumenValor}>{totalClientesGlobal}</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>Ganancia Bruta</Text>
            <Text style={styles.resumenValor}>S/ {gananciaBruta.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.desgloseWrap}>
          <Text style={styles.desgloseTitulo}>Desglose de Ganancia Bruta por plan</Text>
          {ORDEN_PLANES.filter((p) => p !== 'demo').map((planId) => {
            const fila = desglosePorPlan[planId];
            const cantidad = fila?.cantidad ?? 0;
            const subtotal = fila?.subtotal ?? 0;
            return (
              <View key={planId} style={styles.desgloseFila}>
                <Text style={styles.desglosePlan}>{NOMBRE_PLAN[planId] ?? planId.toUpperCase()}</Text>
                <Text style={styles.desgloseDato}>
                  {cantidad} operador{cantidad === 1 ? '' : 'es'}
                  {planId !== 'unlimited' ? ` × S/ ${(PRECIO_PLAN[planId] ?? 0).toFixed(2)}` : ' (monto acordado c/u)'}
                </Text>
                <Text style={styles.desgloseSubtotal}>S/ {subtotal.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.resumen, cardShadow]}>
        <Text style={styles.resumenTitulo}>Resumen de estadísticas de clientes (Operadores de Venezuela)</Text>
        <View style={styles.resumenFila}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>Total operadores Venezuela</Text>
            <Text style={styles.resumenValor}>{totalVenezuelaGlobal}</Text>
          </View>
        </View>
      </View>

      {operadores.map((op, i) => {
        const { pagoPeriodo, planActual, planMonto } = calcularPlanActual(op);
        const esDemo = op.plan === 'demo' || planActual === 'demo';
        const extendido = demoExtendido[op.id];
        const cupoClientes = obtenerLimiteClientes(planActual);

        return (
          <View key={op.id} style={[styles.fila, cardShadow]}>
            <View style={styles.filaRow}>
              <View style={styles.filaLeft}>
                <View style={styles.filaHeader}>
                  <Text style={styles.numero}>#{i + 1}</Text>
                  <Text style={styles.fecha}>Registrado el {new Date(op.created_at).toLocaleDateString('es-PE')}</Text>
                </View>
                <Text style={styles.nombre}>{op.nombre}</Text>
                {op.perfil_negocio?.nombre_negocio ? <Text style={styles.negocio}>{op.perfil_negocio.nombre_negocio}</Text> : null}
                <Text style={styles.dato}>{op.email ?? 'Sin correo'}</Text>
                {op.telefono ? (
                  <Pressable onPress={() => Linking.openURL(`https://wa.me/${op.telefono!.replace(/[^0-9]/g, '')}`)}>
                    <Text style={[styles.dato, styles.telefonoLink]}>{op.telefono}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.dato}>Sin teléfono</Text>
                )}

                <View style={styles.teamRow}>
                  <View style={styles.teamBadge}>
                    <Text style={styles.teamBadgeNum}>{op.totalVenezuela}</Text>
                    <Text style={styles.teamBadgeLabel}>Venezuela</Text>
                  </View>
                  <View style={styles.teamBadge}>
                    <Text style={styles.teamBadgeNum}>{1 + op.totalEquipoPeru}</Text>
                    <Text style={styles.teamBadgeLabel}>Equipo Perú</Text>
                  </View>
                </View>

                <View style={styles.planBloque}>
                  <Text style={styles.planBloqueLabel}>Plan del operador principal</Text>
                  <View
                    style={[
                      styles.planPill,
                      planActual === 'demo' ? styles.planPillDemo : planActual === 'starter' ? styles.planPillStarter : styles.planPillPremium,
                    ]}
                  >
                    <Text style={styles.planPillTexto}>{planLabel(planActual, planMonto)}</Text>
                  </View>
                  {pagoPeriodo?.estado === 'pendiente' && (
                    <Text style={styles.planSolicitado}>
                      Eligió {planLabel(planDesdeMonto(pagoPeriodo.monto))} (S/ {pagoPeriodo.monto.toFixed(2)}) — pendiente de
                      verificar
                    </Text>
                  )}
                  {planActual !== 'demo' && op.plan_inicio && (
                    <Text style={styles.planFechas}>
                      Cambió el {formatearFechaHora(op.plan_inicio)} · Vence el{' '}
                      {formatearFechaHora(fechaFinPlanPagado(op.plan_inicio).toISOString())}
                    </Text>
                  )}
                  {cambiosPendientes[op.id] && (
                    <View style={styles.cambioEnColaBox}>
                      <Text style={styles.cambioEnColaTexto}>
                        {cambiosPendientes[op.id].estado === 'verificado'
                          ? `Pasará a ${planLabel(cambiosPendientes[op.id].plan_solicitado)} el ${
                              op.plan_inicio ? formatearFechaHora(fechaFinPlanPagado(op.plan_inicio).toISOString()) : '—'
                            }`
                          : `Eligió ${planLabel(cambiosPendientes[op.id].plan_solicitado)} (S/ ${cambiosPendientes[op.id].monto.toFixed(2)}) — pendiente de verificar`}
                      </Text>
                      {cambiosPendientes[op.id].estado === 'pendiente' && (
                        <View style={styles.cambioEnColaBotones}>
                          <Pressable
                            style={styles.cambioEnColaBtn}
                            disabled={procesandoCambio === cambiosPendientes[op.id].id}
                            onPress={() => validarCambioPlan(cambiosPendientes[op.id].id)}
                          >
                            <Text style={styles.cambioEnColaBtnTexto}>
                              {procesandoCambio === cambiosPendientes[op.id].id ? '...' : 'Validar'}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={styles.cambioEnColaBtnRechazar}
                            disabled={procesandoCambio === cambiosPendientes[op.id].id}
                            onPress={() => rechazarCambioPlan(cambiosPendientes[op.id].id)}
                          >
                            <Text style={styles.cambioEnColaBtnRechazarTexto}>Rechazar</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.clienteBox}>
                <Text style={styles.clienteNum}>{op.totalClientes}</Text>
                <Text style={styles.clienteLabel}>clientes</Text>
                <View style={styles.clienteCupoRow}>
                  <Text style={styles.clienteCupo}>{cupoClientes === Infinity ? '∞' : cupoClientes}</Text>
                  <Text style={styles.clienteCupoLabel}>cupo</Text>
                </View>
                <View style={styles.clienteBarraBg}>
                  <View
                    style={[
                      styles.clienteBarraFill,
                      {
                        width: `${Math.min(100, (op.totalClientes / cupoClientes) * 100)}%`,
                        backgroundColor:
                          op.totalClientes >= cupoClientes
                            ? colors.danger
                            : op.totalClientes >= cupoClientes * 0.8
                              ? colors.warning
                              : colors.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.checksRow}>
              <View style={styles.checkCol}>
                <Text style={styles.checkLabel}>Validación de pago</Text>
                <RoundCheck
                  checked={pagoPeriodo?.estado === 'verificado'}
                  disabled={!pagoPeriodo || pagoPeriodo.estado !== 'pendiente'}
                  loading={procesando === pagoPeriodo?.id}
                  onPress={() => pagoPeriodo && validarPago(pagoPeriodo.id, op.id, pagoPeriodo.monto)}
                />
                <Text style={styles.checkEstado}>
                  {!pagoPeriodo ? 'Sin comprobante' : pagoPeriodo.estado === 'verificado' ? 'Verificado' : pagoPeriodo.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                </Text>
              </View>
              <View style={styles.checkCol}>
                <Text style={styles.checkLabel}>Acceso a la sesión operador de Perú</Text>
                <RoundCheck
                  checked={op.acceso_concedido}
                  disabled={op.acceso_concedido}
                  loading={procesando === op.id}
                  onPress={() => concederAcceso(op.id)}
                />
                <Text style={styles.checkEstado}>{op.acceso_concedido ? 'Concedido' : 'Sin conceder'}</Text>
              </View>
              {esDemo && (
                <View style={styles.checkCol}>
                  <Text style={styles.checkLabel}>Extender DEMO</Text>
                  <Pressable
                    style={styles.demoExtenderBtn}
                    disabled={procesando === `${op.id}_ext`}
                    onPress={() => setCalendarioDemoAbierto((actual) => (actual === op.id ? null : op.id))}
                  >
                    <Text style={styles.demoExtenderBtnTexto}>
                      {procesando === `${op.id}_ext` ? '...' : '📅 Elegir fecha'}
                    </Text>
                  </Pressable>
                  <Text style={styles.checkEstado}>
                    {extendido ? `Extendido hasta ${formatearFechaCorta(extendido)}` : 'Pendiente'}
                  </Text>
                </View>
              )}
            </View>

            {esDemo && calendarioDemoAbierto === op.id && (
              <View style={styles.calendarioDemoPanel}>
                <Text style={styles.calendarioDemoTitulo}>Elige la nueva fecha de vencimiento del DEMO</Text>
                <CalendarioDias valor={extendido ?? ''} onSeleccionar={(fecha) => extenderDemo(op.id, fecha)} />
              </View>
            )}

            {planActual === 'unlimited' && (
              <View style={styles.unlimitedRow}>
                <Text style={styles.unlimitedLabel}>Monto UNLIMITED (S/):</Text>
                <TextInput
                  style={styles.unlimitedInput}
                  value={montosUnlimited[op.id] ?? ''}
                  onChangeText={(t) => setMontosUnlimited((prev) => ({ ...prev, [op.id]: t }))}
                  keyboardType="numeric"
                  placeholder="Ej: 1500"
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable
                  style={styles.unlimitedBtn}
                  onPress={() => guardarMontoUnlimited(op.id)}
                  disabled={procesando === `${op.id}_unlimited` || !montosUnlimited[op.id]}
                >
                  <Text style={styles.unlimitedBtnTexto}>
                    {procesando === `${op.id}_unlimited` ? '...' : 'Fijar monto y activar'}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.peligroBloque}>
              {eliminandoOperadorId === op.id ? (
                <View style={styles.peligroPanel}>
                  <Text style={styles.peligroTitulo}>Eliminar a {op.nombre} y todo su negocio</Text>
                  <Text style={styles.peligroTexto}>
                    Esto borra para siempre la cuenta de {op.nombre}, su equipo de Perú, sus operadores de Venezuela y sus{' '}
                    {op.totalClientes} cliente(s). Las operaciones y pagos ya realizados se conservan como historial, sin
                    vincularse a ninguna cuenta. Esta acción NO se puede deshacer.
                  </Text>
                  <Text style={styles.peligroLabel}>Escribe el correo del operador para confirmar: {op.email ?? '(sin correo)'}</Text>
                  <TextInput
                    style={styles.peligroInput}
                    value={confirmacionEmail[op.id] ?? ''}
                    onChangeText={(t) => setConfirmacionEmail((prev) => ({ ...prev, [op.id]: t }))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder={op.email ?? ''}
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.peligroBotones}>
                    <Pressable
                      style={styles.peligroCancelar}
                      onPress={() => {
                        setEliminandoOperadorId(null);
                        setConfirmacionEmail((prev) => ({ ...prev, [op.id]: '' }));
                      }}
                      disabled={eliminando}
                    >
                      <Text style={styles.peligroCancelarTexto}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.peligroConfirmar,
                        (eliminando || !op.email || (confirmacionEmail[op.id] ?? '').trim().toLowerCase() !== op.email.toLowerCase()) &&
                          styles.peligroConfirmarDeshabilitado,
                      ]}
                      disabled={eliminando || !op.email || (confirmacionEmail[op.id] ?? '').trim().toLowerCase() !== op.email.toLowerCase()}
                      onPress={() => eliminarOperador(op)}
                    >
                      {eliminando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.peligroConfirmarTexto}>Eliminar definitivamente</Text>}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.peligroAbrirBtn} onPress={() => setEliminandoOperadorId(op.id)}>
                  <Text style={styles.peligroAbrirBtnTexto}>🗑️ Eliminar operador y su negocio</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      {operadores.length === 0 && <Text style={styles.vacio}>Todavía no hay ningún Operador Perú registrado.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, gap: 14, flexGrow: 1, backgroundColor: colors.bg },
  titulo: { color: colors.text, fontSize: 23, fontWeight: '800' },
  resumen: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  resumenTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  resumenFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  resumenItem: { alignItems: 'center', minWidth: 100, flexGrow: 1 },
  resumenLabel: { color: colors.textMuted, fontSize: 13 },
  resumenValor: { color: colors.accent, fontSize: 25, fontWeight: '900', marginTop: 2 },
  desgloseWrap: { gap: 6, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  desgloseTitulo: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  desgloseFila: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  desglosePlan: { color: colors.text, fontSize: 13, fontWeight: '800', width: 90 },
  desgloseDato: { color: colors.textMuted, fontSize: 13, flex: 1, minWidth: 140 },
  desgloseSubtotal: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  fila: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 2 },
  filaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  numero: { color: colors.textMuted, fontSize: 14, fontWeight: '800' },
  fecha: { color: colors.textMuted, fontSize: 13 },
  nombre: { color: colors.text, fontSize: 18, fontWeight: '700' },
  negocio: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 14 },
  telefonoLink: { color: colors.accent, textDecorationLine: 'underline' },
  teamRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  teamBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  teamBadgeNum: { color: colors.warning, fontSize: 15, fontWeight: '900' },
  teamBadgeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  planBloque: { marginTop: 6, gap: 3 },
  planBloqueLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  planPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  planPillDemo: { backgroundColor: `${colors.warning}33` },
  planPillStarter: { backgroundColor: `${colors.success}33` },
  planPillPremium: { backgroundColor: `${colors.primary}33` },
  planPillTexto: { color: colors.text, fontSize: 13, fontWeight: '800' },
  planSolicitado: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  planFechas: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  cambioEnColaBox: {
    marginTop: 4,
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: `${colors.primary}18`,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 6,
  },
  cambioEnColaTexto: { color: colors.text, fontSize: 12, fontWeight: '700' },
  cambioEnColaBotones: { flexDirection: 'row', gap: 8 },
  cambioEnColaBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  cambioEnColaBtnTexto: { color: colors.text, fontSize: 12, fontWeight: '700' },
  cambioEnColaBtnRechazar: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  cambioEnColaBtnRechazarTexto: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  filaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  filaLeft: { flex: 1, gap: 2, minWidth: 200 },
  clienteBox: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 14, alignItems: 'center', justifyContent: 'center', minWidth: 120 },
  clienteNum: { color: colors.accent, fontSize: 41, fontWeight: '900', lineHeight: 42 },
  clienteLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: -2 },
  clienteCupoRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  clienteCupo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  clienteCupoLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  clienteBarraBg: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 8, width: '100%', overflow: 'hidden' },
  clienteBarraFill: { height: 4, borderRadius: 2 },
  checksRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  checkCol: { alignItems: 'center', gap: 6, flex: 1, minWidth: 110, paddingHorizontal: 4 },
  checkLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  checkEstado: { color: colors.textMuted, fontSize: 12 },
  demoExtenderBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  demoExtenderBtnTexto: { color: colors.text, fontSize: 13, fontWeight: '700' },
  calendarioDemoPanel: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  calendarioDemoTitulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  unlimitedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  unlimitedLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  unlimitedInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8, color: colors.text, fontSize: 16, backgroundColor: colors.cardAlt, maxWidth: 100 },
  unlimitedBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  unlimitedBtnTexto: { color: colors.text, fontSize: 14, fontWeight: '700' },
  vacio: { color: colors.textMuted, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  peligroBloque: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  peligroAbrirBtn: { alignSelf: 'flex-start' },
  peligroAbrirBtnTexto: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  peligroPanel: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: 12,
    gap: 8,
    backgroundColor: `${colors.danger}11`,
  },
  peligroTitulo: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  peligroTexto: { color: colors.text, fontSize: 13, lineHeight: 17 },
  peligroLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 4 },
  peligroInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.cardAlt,
  },
  peligroBotones: { flexDirection: 'row', gap: 8, marginTop: 4 },
  peligroCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  peligroCancelarTexto: { color: colors.textMuted, fontWeight: '700' },
  peligroConfirmar: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  peligroConfirmarDeshabilitado: { opacity: 0.4 },
  peligroConfirmarTexto: { color: '#fff', fontWeight: '700' },
});
