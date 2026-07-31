import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { RoleTag } from '../../components/RoleTag';
import { RoundCheck } from '../../components/RoundCheck';
import { diasRestantesDemo, demoVencido, LIMITE_CLIENTES } from '../../lib/plan';
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
}

// Panel de control del admin: resumen de estadísticas arriba, y la lista
// completa de Operadores Perú con los dos checks independientes
// (Validación de pago / Acceso a la sesión).
export default function PanelControl() {
  const [operadores, setOperadores] = useState<OperadorFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

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
    const operadoresRaw = (data as unknown as OperadorFila[] | null) ?? [];

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
    setOperadores(operadoresRaw.map((op) => ({ ...op, totalClientes: conteoClientes[op.id] ?? 0 })));
    setCargando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const validarPago = async (pagoId: string, operadorId: string) => {
    setProcesando(pagoId);
    const { data: usuarioAuth } = await supabase.auth.getUser();
    await supabase
      .from('pagos_suscripcion')
      .update({ estado: 'verificado', verificado_por: usuarioAuth.user?.id, verificado_at: new Date().toISOString() })
      .eq('id', pagoId);
    // Al aprobar, el operador pasa automáticamente de DEMO a STARTER (y se
    // le concede el acceso en el mismo paso, igual que en (admin)/index.tsx).
    await supabase.from('usuarios').update({ plan: 'starter', acceso_concedido: true }).eq('id', operadorId);
    setProcesando(null);
    cargar();
  };

  const concederAcceso = async (operadorId: string) => {
    setProcesando(operadorId);
    await supabase.from('usuarios').update({ acceso_concedido: true }).eq('id', operadorId);
    setProcesando(null);
    cargar();
  };

  const totalOperadores = operadores.length;
  const totalClientesGlobal = operadores.reduce((acc, op) => acc + op.totalClientes, 0);
  const montoTotalPagado = operadores.reduce(
    (acc, op) => acc + op.pagos_suscripcion.filter((p) => p.estado === 'verificado').reduce((s, p) => s + p.monto, 0),
    0
  );

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

      {operadores.map((op, i) => {
        const pagoPeriodo = op.pagos_suscripcion.find((p) => p.periodo === periodoActual());
        return (
          <View key={op.id} style={[styles.fila, cardShadow]}>
            <View style={styles.filaHeader}>
              <Text style={styles.numero}>#{i + 1}</Text>
              <Text style={styles.fecha}>Registrado el {new Date(op.created_at).toLocaleDateString('es-PE')} · {op.totalClientes}/{LIMITE_CLIENTES} clientes</Text>
            </View>
            <Text style={styles.nombre}>{op.nombre}</Text>
            {op.perfil_negocio?.nombre_negocio ? <Text style={styles.negocio}>{op.perfil_negocio.nombre_negocio}</Text> : null}
            <Text style={styles.dato}>{op.email ?? 'Sin correo'}</Text>
            <Text style={styles.dato}>{op.telefono ?? 'Sin teléfono'}</Text>
            <View style={[styles.planPill, op.plan === 'starter' ? styles.planPillStarter : styles.planPillDemo]}>
              <Text style={styles.planPillTexto}>
                {op.plan === 'starter'
                  ? 'STARTER'
                  : demoVencido(op.demo_inicio)
                    ? 'DEMO — vencido'
                    : `DEMO — ${diasRestantesDemo(op.demo_inicio)} días restantes`}
              </Text>
            </View>

            <View style={styles.checksRow}>
              <View style={styles.checkCol}>
                <Text style={styles.checkLabel}>Validación de pago</Text>
                <RoundCheck
                  checked={pagoPeriodo?.estado === 'verificado'}
                  disabled={!pagoPeriodo || pagoPeriodo.estado !== 'pendiente'}
                  loading={procesando === pagoPeriodo?.id}
                  onPress={() => pagoPeriodo && validarPago(pagoPeriodo.id, op.id)}
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
  planPill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  planPillDemo: { backgroundColor: `${colors.warning}33` },
  planPillStarter: { backgroundColor: `${colors.success}33` },
  planPillTexto: { color: colors.text, fontSize: 11, fontWeight: '800' },
  checksRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  checkCol: { alignItems: 'center', gap: 6, flex: 1, paddingHorizontal: 4 },
  checkLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  checkEstado: { color: colors.textMuted, fontSize: 10 },
  vacio: { color: colors.textMuted, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
});
