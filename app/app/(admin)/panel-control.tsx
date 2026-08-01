import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { RoleTag } from '../../components/RoleTag';
import { RoundCheck } from '../../components/RoundCheck';
import { diasRestantesDemo, obtenerLimiteClientes, planDesdeMonto, planLabel } from '../../lib/plan';
import { PlanOperador } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

const periodoActual = () => new Date().toISOString().slice(0, 7);

interface Pago {
  id: string;
  periodo: string;
  estado: 'pendiente' | 'verificado' | 'rechazado';
  monto: number;
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
  perfil_negocio: { nombre_negocio: string } | null;
  pagos_suscripcion: Pago[];
  totalClientes: number;
  totalVenezuela: number;
  totalEquipoPeru: number;
}

export default function PanelControl() {
  const [operadores, setOperadores] = useState<OperadorFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [demoExtendido, setDemoExtendido] = useState<Record<string, boolean>>({});
  const [montosUnlimited, setMontosUnlimited] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select(
        'id, nombre, email, telefono, created_at, acceso_concedido, plan, demo_inicio, perfil_negocio(nombre_negocio), pagos_suscripcion!pagos_suscripcion_operador_peru_id_fkey(id, periodo, estado, monto)'
      )
      .eq('rol', 'operador_peru')
      .order('created_at', { ascending: false });
    if (error) console.error('Error cargando operadores:', error.message);

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

  const validarPago = async (pagoId: string, operadorId: string, monto: number) => {
    setProcesando(pagoId);
    const { data: usuarioAuth } = await supabase.auth.getUser();
    await supabase
      .from('pagos_suscripcion')
      .update({ estado: 'verificado', verificado_por: usuarioAuth.user?.id, verificado_at: new Date().toISOString() })
      .eq('id', pagoId);
    const plan = planDesdeMonto(monto);
    await supabase.from('usuarios').update({ plan, acceso_concedido: true }).eq('id', operadorId);
    setProcesando(null);
    cargar();
  };

  const concederAcceso = async (operadorId: string) => {
    setProcesando(operadorId);
    await supabase.from('usuarios').update({ acceso_concedido: true }).eq('id', operadorId);
    setProcesando(null);
    cargar();
  };

  const extenderDemo = async (operadorId: string) => {
    setProcesando(`${operadorId}_ext`);
    await supabase.from('usuarios').update({ demo_inicio: new Date().toISOString() }).eq('id', operadorId);
    setDemoExtendido((prev) => ({ ...prev, [operadorId]: true }));
    setProcesando(null);
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
    if (existente) {
      await supabase
        .from('pagos_suscripcion')
        .update({ monto, estado: 'verificado', verificado_por: usuarioAuth.user?.id, verificado_at: new Date().toISOString() })
        .eq('id', existente.id);
    } else {
      await supabase.from('pagos_suscripcion').insert({
        operador_peru_id: operadorId,
        periodo,
        monto,
        estado: 'verificado',
        verificado_por: usuarioAuth.user?.id,
        verificado_at: new Date().toISOString(),
      });
    }
    await supabase.from('usuarios').update({ plan: 'unlimited', acceso_concedido: true }).eq('id', operadorId);
    setProcesando(null);
    setMontosUnlimited((prev) => ({ ...prev, [operadorId]: '' }));
    cargar();
  };

  const totalOperadores = operadores.length;
  const totalClientesGlobal = operadores.reduce((acc, op) => acc + op.totalClientes, 0);
  const montoTotalPagado = operadores.reduce((acc, op) => {
    if (!op.acceso_concedido) return acc;
    return acc + op.pagos_suscripcion.filter((p) => p.estado === 'verificado').reduce((s, p) => s + p.monto, 0);
  }, 0);
  const totalVenezuelaGlobal = operadores.reduce((acc, op) => acc + op.totalVenezuela, 0);

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
            <Text style={styles.resumenLabel}>Monto total pagado</Text>
            <Text style={styles.resumenValor}>S/ {montoTotalPagado.toFixed(2)}</Text>
          </View>
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
        const pagoPeriodo = op.pagos_suscripcion.find((p) => p.periodo === periodoActual());
        const planActual = pagoPeriodo?.estado === 'verificado' ? planDesdeMonto(pagoPeriodo.monto) : op.plan;
        const planMonto = pagoPeriodo?.estado === 'verificado' ? pagoPeriodo.monto : undefined;
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
                  <Pressable onPress={() => Linking.openURL(`https://wa.me/${op.telefono.replace(/[^0-9]/g, '')}`)}>
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

                <View
                  style={[
                    styles.planPill,
                    planActual === 'demo' ? styles.planPillDemo : planActual === 'starter' ? styles.planPillStarter : styles.planPillPremium,
                  ]}
                >
                  <Text style={styles.planPillTexto}>{planLabel(planActual, planMonto)}</Text>
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
                  <Text style={styles.checkLabel}>Extender DEMO 7 días</Text>
                  <RoundCheck
                    checked={extendido || false}
                    disabled={extendido || false}
                    loading={procesando === `${op.id}_ext`}
                    onPress={() => extenderDemo(op.id)}
                  />
                  <Text style={styles.checkEstado}>{extendido ? 'Extendido' : 'Pendiente'}</Text>
                </View>
              )}
            </View>

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
  titulo: { color: colors.text, fontSize: 20, fontWeight: '800' },
  resumen: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  resumenTitulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-around' },
  resumenItem: { alignItems: 'center' },
  resumenLabel: { color: colors.textMuted, fontSize: 11 },
  resumenValor: { color: colors.accent, fontSize: 22, fontWeight: '900', marginTop: 2 },
  fila: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 2 },
  filaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  numero: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  fecha: { color: colors.textMuted, fontSize: 11 },
  nombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  negocio: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 12 },
  telefonoLink: { color: colors.accent, textDecorationLine: 'underline' },
  teamRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  teamBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  teamBadgeNum: { color: colors.warning, fontSize: 13, fontWeight: '900' },
  teamBadgeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  planPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  planPillDemo: { backgroundColor: `${colors.warning}33` },
  planPillStarter: { backgroundColor: `${colors.success}33` },
  planPillPremium: { backgroundColor: `${colors.primary}33` },
  planPillTexto: { color: colors.text, fontSize: 11, fontWeight: '800' },
  filaRow: { flexDirection: 'row' },
  filaLeft: { flex: 1, gap: 2, minWidth: 0 },
  clienteBox: { backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 14, minWidth: 120 },
  clienteNum: { color: colors.accent, fontSize: 36, fontWeight: '900', lineHeight: 42 },
  clienteLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: -2 },
  clienteCupoRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  clienteCupo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  clienteCupoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  clienteBarraBg: { height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 8, width: '100%', overflow: 'hidden' },
  clienteBarraFill: { height: 4, borderRadius: 2 },
  checksRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  checkCol: { alignItems: 'center', gap: 6, flex: 1, paddingHorizontal: 4 },
  checkLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  checkEstado: { color: colors.textMuted, fontSize: 10 },
  unlimitedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  unlimitedLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  unlimitedInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 8, color: colors.text, fontSize: 14, backgroundColor: colors.cardAlt, maxWidth: 100 },
  unlimitedBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  unlimitedBtnTexto: { color: colors.text, fontSize: 12, fontWeight: '700' },
  vacio: { color: colors.textMuted, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
});
