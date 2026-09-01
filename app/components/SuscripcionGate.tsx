import { useCallback, useEffect, useState, PropsWithChildren } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { RoleTag } from './RoleTag';
import { AccesoPendienteAviso } from './AccesoPendienteAviso';
import { FormularioSolicitudPlan } from './FormularioSolicitudPlan';
import { PagoSuscripcion, PlanOperador } from '../types/database';
import { demoVencido, planPagadoVencido } from '../lib/plan';
import { colors, radius, cardShadow } from '../constants/theme';

interface InfoPlanDueno {
  plan: PlanOperador;
  demo_inicio: string | null;
  plan_inicio: string | null;
  acceso_concedido: boolean;
  // Plan 'medida' / 'unlimited': N° de clientes pactado -- se usa para
  // reactivar el mismo plan a la medida (su monto = N × S/ 1).
  limite_clientes_unlimited: number | null;
}

// Envuelve las pestañas del Operador Perú. Mientras el negocio esté en
// plan DEMO vigente, acceso libre. Al vencer el DEMO o el ciclo de 30
// días de un plan pagado (y sin ninguna renovación/cambio ya pagado en
// espera de activarse), exige pago Y que el admin conceda el acceso por
// separado — sin forma de saltárselo navegando a otra pestaña, porque
// reemplaza el árbol de navegación completo.
export function SuscripcionGate({ children }: PropsWithChildren) {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [pago, setPago] = useState<PagoSuscripcion | null>(null);
  // true si ya hay un pago de renovación/cambio de plan en camino que
  // activará solo al terminar el ciclo actual (ver cambios_plan_pendientes).
  const [tieneCambioEnCamino, setTieneCambioEnCamino] = useState(false);
  // La suscripción/plan siempre es la del DUEÑO del negocio: si `usuario`
  // es un miembro de equipo, se resuelve el `operador_peru_id` al que
  // pertenece y se usa el plan de esa cuenta, no la propia (que no tiene
  // sentido para un rol que no es operador_peru).
  const [infoPlanDueno, setInfoPlanDueno] = useState<InfoPlanDueno | null>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);

    let idDueno = usuario.id;
    let info: InfoPlanDueno = {
      plan: usuario.plan,
      demo_inicio: usuario.demo_inicio,
      plan_inicio: usuario.plan_inicio,
      acceso_concedido: usuario.acceso_concedido,
      limite_clientes_unlimited: usuario.limite_clientes_unlimited,
    };
    if (usuario.rol === 'operador_peru_miembro') {
      const { data: miembro } = await supabase
        .from('operador_peru_miembro')
        .select('operador_peru_id')
        .eq('usuario_id', usuario.id)
        .maybeSingle();
      if (miembro?.operador_peru_id) {
        idDueno = miembro.operador_peru_id;
        const { data: dueno } = await supabase
          .from('usuarios')
          .select('plan, demo_inicio, plan_inicio, acceso_concedido, limite_clientes_unlimited')
          .eq('id', idDueno)
          .maybeSingle();
        if (dueno) info = dueno as InfoPlanDueno;
      }
    }
    setInfoPlanDueno(info);

    const [{ data: pagoData }, { data: cambioData }] = await Promise.all([
      supabase
        .from('pagos_suscripcion')
        .select('*')
        .eq('operador_peru_id', idDueno)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('cambios_plan_pendientes')
        .select('id')
        .eq('operador_peru_id', idDueno)
        .neq('estado', 'rechazado')
        .is('activado_at', null)
        .maybeSingle(),
    ]);
    setPago(pagoData as PagoSuscripcion | null);
    setTieneCambioEnCamino(!!cambioData);
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando || !usuario || !infoPlanDueno) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const etiquetaMiembro = usuario.rol === 'operador_peru_miembro' ? 'Operador Perú · Miembro de equipo' : undefined;

  // Mientras el negocio esté en plan DEMO y no haya vencido, acceso libre
  // para el dueño y su equipo, sin pasar por pago ni formulario.
  if (infoPlanDueno.plan === 'demo') {
    if (!demoVencido(infoPlanDueno.demo_inicio)) {
      return <>{children}</>;
    }
    // DEMO vencido: si ya hay una solicitud de STARTER en revisión, se
    // mantiene la pantalla de "en breve te responderemos" en vez del
    // bloqueo pasivo, para no castigar a quien ya intentó pagar a tiempo.
    if (pago?.estado === 'pendiente') {
      return (
        <View style={styles.center}>
          <RoleTag rol="operador_peru" etiqueta={etiquetaMiembro} />
          <View style={[styles.card, cardShadow, styles.avisoPendiente]}>
            <Text style={styles.avisoTitulo}>Solicitud enviada</Text>
            <Text style={styles.avisoTexto}>En breve te responderemos.</Text>
          </View>
        </View>
      );
    }
    return <AccesoPendienteAviso rol="operador_peru" etiqueta={etiquetaMiembro} />;
  }

  // A partir de acá, plan pagado: vencido = ya pasaron sus 30 días desde
  // plan_inicio. Si hay un cambio ya pagado en camino, el acceso sigue
  // sin cortarse aunque el ciclo ya haya terminado -- se activa solo
  // cuando corresponda (ver cron activar-planes-encolados).
  const vencido = planPagadoVencido(infoPlanDueno.plan_inicio);
  const bloqueadoPorVencimiento = vencido && !tieneCambioEnCamino;

  // Un miembro de equipo hereda el acceso del dueño (no tiene pago propio
  // que verificar).
  if (usuario.rol === 'operador_peru_miembro') {
    const bloqueado = !infoPlanDueno.acceso_concedido || bloqueadoPorVencimiento;
    return bloqueado ? <AccesoPendienteAviso rol="operador_peru" etiqueta={etiquetaMiembro} /> : <>{children}</>;
  }

  if (infoPlanDueno.acceso_concedido && !bloqueadoPorVencimiento) {
    return <>{children}</>;
  }

  // Acceso concedido pero el ciclo ya venció y no hay nada en camino: el
  // dueño tiene que reactivar -- se le ofrece su último plan real (no
  // siempre STARTER), ya que puede haber estado en PRO/AVANCE/etc. (acá
  // ya sabemos que no es 'demo', ese caso se resolvió más arriba).
  const planParaReactivar = infoPlanDueno.plan;

  if (infoPlanDueno.acceso_concedido && bloqueadoPorVencimiento && pago?.estado !== 'pendiente') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <RoleTag rol="operador_peru" />
        <Text style={styles.titulo}>Tu plan venció</Text>
        <Text style={styles.avisoTexto}>Renueva o cambia de plan para seguir usando la app sin interrupciones.</Text>

        {pago?.estado === 'rechazado' && (
          <View style={[styles.card, cardShadow, styles.avisoRechazado]}>
            <Text style={styles.avisoTexto}>Tu comprobante fue rechazado{pago.motivo_rechazo ? `: ${pago.motivo_rechazo}` : '.'} Sube uno nuevo.</Text>
          </View>
        )}

        <FormularioSolicitudPlan
          plan={planParaReactivar}
          modo="nueva"
          onEnviado={cargar}
          clientesAMedida={planParaReactivar === 'medida' ? infoPlanDueno.limite_clientes_unlimited ?? undefined : undefined}
        />
      </ScrollView>
    );
  }

  // Pago verificado, pero el admin todavía no concede el acceso (segundo
  // candado independiente del pago, ver README "Suscripción mensual").
  if (pago?.estado === 'verificado' && !infoPlanDueno.acceso_concedido) {
    return (
      <View style={styles.center}>
        <RoleTag rol="operador_peru" />
        <View style={[styles.card, cardShadow, styles.avisoPendiente]}>
          <Text style={styles.avisoTitulo}>Pago verificado ✓</Text>
          <Text style={styles.avisoTexto}>Ya confirmamos tu pago. En breve el administrador activará tu acceso.</Text>
        </View>
      </View>
    );
  }

  // Ya envió el comprobante — esperando revisión del admin.
  if (pago?.estado === 'pendiente') {
    return (
      <View style={styles.center}>
        <RoleTag rol="operador_peru" />
        <View style={[styles.card, cardShadow, styles.avisoPendiente]}>
          <Text style={styles.avisoTitulo}>Solicitud enviada</Text>
          <Text style={styles.avisoTexto}>En breve te responderemos.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol="operador_peru" />
      <Text style={styles.titulo}>Solicitud de acceso</Text>

      {pago?.estado === 'rechazado' && (
        <View style={[styles.card, cardShadow, styles.avisoRechazado]}>
          <Text style={styles.avisoTexto}>Tu comprobante fue rechazado{pago.motivo_rechazo ? `: ${pago.motivo_rechazo}` : '.'} Sube uno nuevo.</Text>
        </View>
      )}

      <FormularioSolicitudPlan plan={planParaReactivar} modo="nueva" onEnviado={cargar} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 25, fontWeight: '800' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4, width: '100%' },
  avisoPendiente: { borderColor: colors.warning, alignItems: 'center', gap: 6 },
  avisoRechazado: { borderColor: colors.danger },
  avisoTitulo: { color: colors.text, fontSize: 18, fontWeight: '800' },
  avisoTexto: { color: colors.text, fontSize: 15, lineHeight: 19, textAlign: 'center' },
});
