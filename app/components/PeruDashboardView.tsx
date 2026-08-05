import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image, Modal, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { mimeDeExtension } from '../lib/imagenUtil';
import { PerfilNegocio, Tasa, OperadorPeruMiembro, OperadorVenezuelaPerfil } from '../types/database';
import { OperationRow, OperationRowData, formatearTiempoRespuesta, FORMATTER_FECHA_HORA } from './OperationRow';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { hoyLocal, fechaLocalDe, yaCerroHoy } from '../lib/fechaLocal';
import { calcularGananciaOperacion } from '../lib/tasaCalculo';
import { useAlertaSonora } from '../lib/useAlertaSonora';
import { LiveClock } from './LiveClock';
import { RoleTag } from './RoleTag';
import { TipoSesionOperador, etiquetaSesion } from '../lib/sesionOperador';
import { colors, radius, cardShadow } from '../constants/theme';

// Panel de operaciones de Remesas Perú-Venezuela. Lo usan las tres
// sesiones de operador, cada una con su alcance:
//
//   * 'principal'  (Operador principal de Perú): TODAS las operaciones del
//     negocio (las suyas + las de su equipo de Perú), con el nombre del
//     operador que atiende cada una, opción a editar/check, y puede derivar
//     sus propias solicitudes a un miembro de Perú.
//   * 'miembro'    (Operador de Perú miembro): SOLO las operaciones de sus
//     clientes invitados + las que el principal le derivó.
//   * 'venezuela'  (Operador de Venezuela): SOLO las operaciones de los
//     miembros de Perú que el principal le asignó.
export function PeruDashboardView({
  operadorPeruId,
  nombreUsuarioActual,
  tipoSesion,
  miembroId = null,
  veId = null,
  miembrosAsignadosIds = null,
  puedeValidarVeAunSinSerElMismo = true,
}: {
  operadorPeruId: string;
  nombreUsuarioActual: string;
  tipoSesion: TipoSesionOperador;
  /** Id de la fila operador_peru_miembro de la sesión (solo tipo 'miembro'). */
  miembroId?: string | null;
  /** Id de la fila operador_venezuela_perfil de la sesión (solo tipo 'venezuela'). */
  veId?: string | null;
  /** Ids de los miembros de Perú asignados a este VE (solo tipo 'venezuela'). */
  miembrosAsignadosIds?: string[] | null;
  puedeValidarVeAunSinSerElMismo?: boolean;
}) {
  const esPrincipal = tipoSesion === 'principal';
  const esMiembroPe = tipoSesion === 'miembro';
  const esVenezuela = tipoSesion === 'venezuela';
  // Solo el Operador principal gestiona horario/eslogan/rentabilidad/equipo
  // y publica la tasa del día.
  const puedeGestionar = esPrincipal;

  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilNegocio | null>(null);
  const [tasa, setTasa] = useState<Tasa | null>(null);
  const [operaciones, setOperaciones] = useState<OperationRowData[]>([]);
  const [miembros, setMiembros] = useState<OperadorPeruMiembro[]>([]);
  const [vePerfiles, setVePerfiles] = useState<OperadorVenezuelaPerfil[]>([]);
  const [principalTelefono, setPrincipalTelefono] = useState<string | null>(null);
  const [validando, setValidando] = useState<{ id: string; tipo: 'peru' | 've' } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [editandoEslogan, setEditandoEslogan] = useState(false);
  const [esloganBorrador, setEsloganBorrador] = useState('');
  const [vistaOperaciones, setVistaOperaciones] = useState<'en_curso' | 'realizadas' | 'por_revisar' | 'derivadas'>('en_curso');
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);

  // Derivación de solicitudes (solo Operador principal): modal con la lista
  // de miembros de Perú a los que puede derivar sus solicitudes de clientes.
  const [derivandoOp, setDerivandoOp] = useState<OperationRowData | null>(null);
  const [derivandoMiembroId, setDerivandoMiembroId] = useState<string | null>(null);
  const [derivandoEnviando, setDerivandoEnviando] = useState(false);

  // El corte de "realizadas" hacia solo-estadísticas es a la hora de
  // cierre del horario de atención (no a medianoche) -- este tick fuerza
  // un recálculo periódico para que la lista se vacíe sola en cuanto se
  // cruza esa hora, sin necesidad de recargar la pantalla.
  const [tickHorario, setTickHorario] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTickHorario((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const cargar = useCallback(async () => {
    let query = supabase
      .from('solicitudes')
      .select(
        '*, cliente:usuarios!solicitudes_cliente_id_fkey(nombre, telefono, email), validador_peru:usuarios!solicitudes_validado_peru_por_fkey(nombre), validador_ve:usuarios!solicitudes_validado_ve_por_fkey(nombre), atendido_por:operador_peru_miembro!solicitudes_operador_peru_miembro_id_fkey(nombre, telefono)'
      )
      .eq('negocio_operador_peru_id', operadorPeruId)
      .order('created_at', { ascending: false })
      .limit(200);

    // Alcance de cada sesión: miembro -> solo sus operaciones; VE -> solo
    // las de los miembros que le asignaron; principal -> todas las del negocio.
    if (esMiembroPe && miembroId) {
      query = query.eq('operador_peru_miembro_id', miembroId);
    } else if (esVenezuela && miembrosAsignadosIds && miembrosAsignadosIds.length > 0) {
      query = query.in('operador_peru_miembro_id', miembrosAsignadosIds);
    }

    const [{ data: perfilData }, { data: tasaData }, { data: opsData }, { data: miembrosData }, { data: vePerfilesData }, { data: principalData }] =
      await Promise.all([
        supabase.from('perfil_negocio').select('*').eq('operador_peru_id', operadorPeruId).maybeSingle(),
        supabase
          .from('tasas')
          .select('*')
          .eq('publicada_por', operadorPeruId)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        esVenezuela && miembrosAsignadosIds && miembrosAsignadosIds.length === 0 ? Promise.resolve({ data: null }) : query,
        supabase
          .from('operador_peru_miembro')
          .select('*')
          .eq('operador_peru_id', operadorPeruId)
          .order('created_at', { ascending: true }),
        supabase.from('operador_venezuela_perfil').select('*').eq('operador_peru_id', operadorPeruId),
        supabase.from('usuarios').select('telefono').eq('id', operadorPeruId).maybeSingle(),
      ]);

    setPerfil(perfilData as PerfilNegocio | null);
    setTasa(tasaData as Tasa | null);
    setMiembros((miembrosData as OperadorPeruMiembro[] | null) ?? []);
    setVePerfiles((vePerfilesData as OperadorVenezuelaPerfil[] | null) ?? []);
    setPrincipalTelefono(principalData?.telefono ?? null);
    if (opsData) {
      setOperaciones(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (opsData as any[]).map((row) => ({
          ...row,
          cliente_nombre: row.cliente?.nombre ?? 'Cliente',
          cliente_telefono: row.cliente?.telefono ?? null,
          cliente_email: row.cliente?.email ?? null,
          validador_peru_nombre: row.validador_peru?.nombre ?? null,
          validador_ve_nombre: row.validador_ve?.nombre ?? null,
          operador_peru_atiende: row.atendido_por?.nombre ?? null,
          operador_peru_atiende_telefono: row.atendido_por?.telefono ?? null,
        }))
      );
    } else {
      setOperaciones([]);
    }
    setCargando(false);
  }, [operadorPeruId, esMiembroPe, esVenezuela, miembroId, miembrosAsignadosIds]);

  useEffect(() => {
    cargar();
    const channel = supabase
      .channel(`peru-dashboard-${operadorPeruId}-${tipoSesion}-${miembroId ?? ''}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes', filter: `negocio_operador_peru_id=eq.${operadorPeruId}` },
        () => cargar()
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.warn(`peru-dashboard-${operadorPeruId}: realtime status = ${status}`);
      });

    // Red de seguridad: si el canal realtime se corta en silencio (pasa
    // ocasionalmente con websockets de larga duración), esto garantiza que
    // la lista -- y por lo tanto la alarma sonora, que depende de
    // `operaciones` -- nunca quede más de ~5s desactualizada.
    const intervalo = setInterval(cargar, 5_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar, operadorPeruId, tipoSesion, miembroId]);

  // "En curso" no tiene fecha límite: una operación pendiente sigue
  // apareciendo aquí sin importar cuántos días pasen, hasta que se
  // complete. "Realizadas" en cambio se corta a la hora de cierre del
  // horario de atención del negocio (no a medianoche): pasada esa hora,
  // la lista de hoy queda vacía aquí -- sin perder nada, solo dejan de
  // listarse; siguen disponibles en Estadísticas con los filtros de fecha.
  // Sin horario_fin configurado, se usa medianoche como respaldo (ya lo
  // cubre el filtro por fecha calendario de abajo).
  const enCurso = useMemo(() => operaciones.filter((o) => !o.check_deposito_ve), [operaciones]);
  const realizadas = useMemo(() => {
    if (yaCerroHoy(perfil?.horario_fin)) return [];
    return operaciones.filter((o) => o.check_deposito_ve && o.check_deposito_ve_at && fechaLocalDe(o.check_deposito_ve_at) === hoyLocal());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operaciones, perfil?.horario_fin, tickHorario]);
  // El cliente reportó que el depósito no llegó a la cuenta del
  // beneficiario -- queda aquí hasta que un operador (Perú o Venezuela) lo
  // marque como resuelto.
  const porRevisar = useMemo(() => operaciones.filter((o) => o.en_revision), [operaciones]);
  // Operaciones que el Operador principal derivó a este miembro de Perú:
  // se ven en su propia lista "OPERACIONES DERIVADAS".
  const derivadas = useMemo(() => operaciones.filter((o) => o.derivada_de_principal), [operaciones]);

  // Alerta sonora: suena apenas aparece una operación que necesita la
  // acción de ESTA sesión -- para Venezuela, un depósito que Perú ya
  // validó y espera que VE la cargue; para Perú, una solicitud nueva del
  // cliente que todavía no valida; para ambos, un caso reportado por el
  // cliente en "Operaciones por revisar" (cualquier operador lo resuelve).
  // Se repite cada 2 minutos mientras siga pendiente, hasta que se atienda.
  const reproducirAlerta = useAlertaSonora();
  const pendientesAccion = useMemo(
    () =>
      operaciones.filter(
        (o) => (esVenezuela ? o.check_deposito_peru && !o.check_deposito_ve : !o.check_deposito_peru) || o.en_revision
      ),
    [operaciones, esVenezuela]
  );
  const pendientesAccionRef = useRef(0);

  useEffect(() => {
    if (pendientesAccion.length > pendientesAccionRef.current) reproducirAlerta();
    pendientesAccionRef.current = pendientesAccion.length;
  }, [pendientesAccion.length, reproducirAlerta]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pendientesAccionRef.current > 0) reproducirAlerta();
    }, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [reproducirAlerta]);

  // Aviso de una sola vez (no se repite) para el Operador Perú cuando
  // Venezuela confirma un depósito: a esa altura ya no hay nada pendiente
  // por atender de este lado, solo se avisa que la operación se completó.
  // `null` en la ref marca "todavía no se estableció la base" -- así no
  // suena de golpe por todas las operaciones que ya estaban completadas
  // antes de entrar a la pantalla.
  const completadosConocidosRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (esVenezuela) return;
    const completadosAhora = new Set(operaciones.filter((o) => o.check_deposito_ve).map((o) => o.id));
    if (completadosConocidosRef.current === null) {
      completadosConocidosRef.current = completadosAhora;
      return;
    }
    const hayNuevoCompletado = [...completadosAhora].some((id) => !completadosConocidosRef.current!.has(id));
    if (hayNuevoCompletado) reproducirAlerta();
    completadosConocidosRef.current = completadosAhora;
  }, [operaciones, esVenezuela, reproducirAlerta]);

  // Buscador único (nombre, teléfono, fecha, monto en soles o año) — un solo
  // campo de texto en vez de varios filtros separados, para no sobrecargar
  // la pantalla en dispositivos de gama baja.
  const realizadasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return realizadas;
    return realizadas.filter((o) => {
      const fecha = new Date(o.created_at);
      const anio = String(fecha.getFullYear());
      const fechaCorta = fecha.toLocaleDateString('es-PE');
      return (
        o.cliente_nombre.toLowerCase().includes(q) ||
        (o.cliente_telefono ?? '').toLowerCase().includes(q) ||
        o.monto_pen.toFixed(2).includes(q) ||
        anio.includes(q) ||
        fechaCorta.includes(q)
      );
    });
  }, [realizadas, busqueda]);

  // Numeración única y continua sobre TODAS las operaciones (en curso +
  // realizadas), asignada por orden de creación. Así una operación
  // conserva su número al pasar de "en curso" a "realizada", sin importar
  // el orden en que se vayan validando unas y otras.
  const numeracion = useMemo(() => {
    const ordenadas = [...operaciones].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const mapa = new Map<string, number>();
    ordenadas.forEach((op, i) => mapa.set(op.id, i + 1));
    return mapa;
  }, [operaciones]);

  // Nombre del operador de Perú que atiende cada operación. `null` = la
  // atiende el Operador principal de Perú directamente.
  const atendidoPor = (op: OperationRowData): string =>
    op.operador_peru_miembro_id ? (op.operador_peru_atiende ?? 'Operador de Perú miembro') : 'Operador principal de Perú';
  const atendidoPorTelefono = (op: OperationRowData): string | null =>
    op.operador_peru_miembro_id ? op.operador_peru_atiende_telefono ?? null : principalTelefono;

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const filas = realizadasFiltradas.map((op) => ({
        '#': numeracion.get(op.id) ?? '',
        Cliente: op.cliente_nombre,
        Teléfono: op.cliente_telefono ?? '',
        Correo: op.cliente_email ?? '',
        'Beneficiario (VE)': op.beneficiario_nombre,
        'C.I.': op.beneficiario_ci ?? '',
        'Tipo de transferencia': op.tipo_transferencia === 'pago_movil' ? 'Pago móvil' : 'Transferencia bancaria',
        'Entidad bancaria': op.beneficiario_banco,
        'N° cuenta': op.beneficiario_cuenta,
        'Monto (S/)': op.monto_pen,
        'Forma de pago': op.metodo_pago === 'yape' ? 'Yape' : op.metodo_pago === 'plin' ? 'Plin' : 'Transferencia bancaria',
        'Recibe (Bs)': op.monto_ves,
        'Operador de Perú que atiende': atendidoPor(op),
        'Validado en Perú': op.check_deposito_peru_at ? FORMATTER_FECHA_HORA.format(new Date(op.check_deposito_peru_at)) : '',
        'Validado en Venezuela': op.check_deposito_ve_at ? FORMATTER_FECHA_HORA.format(new Date(op.check_deposito_ve_at)) : '',
        'Tiempo de respuesta':
          op.check_deposito_peru_at && op.check_deposito_ve_at
            ? formatearTiempoRespuesta(op.check_deposito_peru_at, op.check_deposito_ve_at)
            : '',
      }));
      await generarYCompartirExcel('operaciones-realizadas', 'Operaciones', filas);
    } finally {
      setExportando(false);
    }
  };

  // Totales en tiempo real por estado (En curso / Realizadas hoy / Por
  // revisar): cantidad + monto en ambas monedas, visibles para todos los
  // roles.
  const totalesPorEstado = useMemo(() => {
    const sumar = (lista: OperationRowData[]) => ({
      n: lista.length,
      montoPen: lista.reduce((acc, o) => acc + o.monto_pen, 0),
      montoVes: lista.reduce((acc, o) => acc + o.monto_ves, 0),
    });
    return { enCurso: sumar(enCurso), realizadas: sumar(realizadas), porRevisar: sumar(porRevisar) };
  }, [enCurso, realizadas, porRevisar]);

  // Ganancia Bruta/Neta y comisiones del día (solo sobre `realizadas`, ver
  // Calculos-tasas-dinero-comisiones.md). Se usa la tasa de venta y la tasa
  // de adquisición GUARDADAS EN CADA OPERACIÓN (no la tasa vigente ahora),
  // para que el cálculo sea correcto sin importar cuándo se consulte.
  const gananciaHoy = useMemo(() => {
    let montoBeneficiarioVes = 0;
    let transferenciaTotalVes = 0;
    let comisionPeruTotalPen = 0;
    let comisionVeTotalVes = 0;
    let comisionVeTotalPen = 0;
    let gananciaBrutaTotal = 0;
    let gananciaNetaTotal = 0;
    let miComisionPen = 0;
    let miComisionVes = 0;

    realizadas.forEach((op) => {
      const miembroOp = op.operador_peru_miembro_id ? miembros.find((m) => m.id === op.operador_peru_miembro_id) : null;
      // La solicitud no guarda directamente a qué Operador Venezuela
      // pertenece -- se deriva de a quién el principal asignó el miembro de
      // Perú que la atiende (operador_peru_miembro.operador_venezuela_id).
      // Si el principal atiende el cliente directamente (sin miembro), no
      // hay un VE asignado y esa comisión queda en 0.
      const veIdDeLaOp = miembroOp?.operador_venezuela_id ?? null;
      const veOp = veIdDeLaOp ? vePerfiles.find((v) => v.id === veIdDeLaOp) : null;
      // Usa el % congelado en la operación (comision_*_pct_aplicada, ver
      // migración 0060) para que el historial no cambie si el principal
      // ajusta el % del operador después -- cae al % vigente solo para
      // operaciones anteriores a ese campo.
      const comisionPeruPct = (op.comision_peru_pct_aplicada ?? miembroOp?.comision_pct ?? 0) / 100;
      const comisionVePct = (op.comision_venezuela_pct_aplicada ?? veOp?.comision_pct ?? 0) / 100;
      const g = calcularGananciaOperacion(op.monto_pen, op.tasa_pen_ves, op.tasa_real_compra, comisionPeruPct, comisionVePct);
      if (!g) return;

      montoBeneficiarioVes += g.beneficiarioVes;
      transferenciaTotalVes += g.transferenciaTotalVes;
      comisionPeruTotalPen += g.comisionPeruPen;
      comisionVeTotalVes += g.comisionVenezuelaVes;
      comisionVeTotalPen += g.comisionVenezuelaPen;
      gananciaBrutaTotal += g.gananciaBrutaPen;
      gananciaNetaTotal += g.gananciaNetaPen;

      if (esMiembroPe && op.operador_peru_miembro_id === miembroId) miComisionPen += g.comisionPeruPen;
      if (esVenezuela && veIdDeLaOp === veId) {
        miComisionVes += g.comisionVenezuelaVes;
        miComisionPen += g.comisionVenezuelaPen;
      }
    });

    return {
      montoBeneficiarioVes,
      transferenciaTotalVes,
      comisionPeruTotalPen,
      comisionVeTotalVes,
      comisionVeTotalPen,
      gananciaBrutaTotal,
      gananciaNetaTotal,
      porcentajeBruta: totalesPorEstado.realizadas.montoPen ? (gananciaBrutaTotal / totalesPorEstado.realizadas.montoPen) * 100 : 0,
      porcentajeNeta: totalesPorEstado.realizadas.montoPen ? (gananciaNetaTotal / totalesPorEstado.realizadas.montoPen) * 100 : 0,
      miComisionPen,
      miComisionVes,
    };
  }, [realizadas, miembros, vePerfiles, esMiembroPe, esVenezuela, miembroId, veId, totalesPorEstado.realizadas.montoPen]);

  // El aviso al cliente/beneficiario ya no se abre acá manualmente: al
  // marcar cada check, un trigger en la base de datos dispara el envío
  // automático por Telegram (ver supabase/migrations/0040_telegram_notificaciones.sql
  // y supabase/functions/telegram-notificar-deposito).
  const avisarError = (mensaje: string) => {
    if (Platform.OS === 'web') window.alert(mensaje);
    else Alert.alert('No se pudo completar la acción', mensaje);
  };

  const validarPeru = async (op: OperationRowData) => {
    setValidando({ id: op.id, tipo: 'peru' });
    const { error } = await supabase.rpc('validar_deposito_peru', { p_solicitud_id: op.id });
    setValidando(null);
    if (error) {
      avisarError(error.message);
      return;
    }
    cargar();
  };

  const validarVe = async (op: OperationRowData, comprobanteUri: string, comprobanteExt: string) => {
    setValidando({ id: op.id, tipo: 've' });
    try {
      const path = `${op.id}/comprobante-vz.${comprobanteExt}`;
      // arrayBuffer() en vez de blob(): en React Native fetch(...).blob() de
      // un archivo local es muy lento (ver lib/imagenUtil.ts).
      const arrayBuffer = await (await fetch(comprobanteUri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(path, arrayBuffer, { upsert: true, contentType: mimeDeExtension(comprobanteExt) });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

      const { error } = await supabase.rpc('validar_deposito_venezuela', {
        p_solicitud_id: op.id,
        p_comprobante_url: publicUrl.publicUrl,
      });
      if (error) throw error;

      cargar();
    } catch (err) {
      avisarError(err instanceof Error ? err.message : 'No se pudo validar el depósito.');
    } finally {
      setValidando(null);
    }
  };

  const resolverRevision = async (op: OperationRowData) => {
    setResolviendoId(op.id);
    const { error } = await supabase.rpc('resolver_revision_beneficiario', { p_solicitud_id: op.id });
    setResolviendoId(null);
    if (error) {
      avisarError(error.message);
      return;
    }
    cargar();
  };

  const abrirDerivacion = (op: OperationRowData) => {
    setDerivandoOp(op);
    setDerivandoMiembroId(null);
  };

  const confirmarDerivacion = async () => {
    if (!derivandoOp || !derivandoMiembroId) return;
    setDerivandoEnviando(true);
    const { error } = await supabase.rpc('derivar_solicitud', {
      p_solicitud_id: derivandoOp.id,
      p_operador_peru_miembro_id: derivandoMiembroId,
    });
    setDerivandoEnviando(false);
    setDerivandoOp(null);
    setDerivandoMiembroId(null);
    if (error) {
      Alert.alert('No se pudo derivar', error.message);
      return;
    }
    cargar();
  };

  const guardarEslogan = async () => {
    await supabase
      .from('perfil_negocio')
      .update({ eslogan: esloganBorrador.trim() })
      .eq('operador_peru_id', operadorPeruId);
    setEditandoEslogan(false);
    cargar();
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol={esVenezuela ? 'operador_venezuela' : 'operador_peru'} etiqueta={etiquetaSesion(tipoSesion)} />
      {!!perfil?.nombre_negocio && (
        <View style={styles.negocioRow}>
          {!!perfil.logo_url && <Image source={{ uri: perfil.logo_url }} style={styles.negocioLogo} resizeMode="cover" />}
          <Text style={styles.negocioNombre} numberOfLines={1}>
            {perfil.nombre_negocio}
          </Text>
        </View>
      )}
      <Text style={styles.bienvenida}>Bienvenido a Remesas Perú-Venezuela, {nombreUsuarioActual}</Text>
      <LiveClock />

      <View style={[styles.card, cardShadow, styles.esloganCard]}>
        <View style={styles.esloganHeaderRow}>
          <Text style={styles.miniLabel}>Eslogan (sesión cliente)</Text>
          {puedeGestionar && !editandoEslogan && (
            <Pressable
              onPress={() => {
                setEsloganBorrador(perfil?.eslogan ?? '');
                setEditandoEslogan(true);
              }}
            >
              <Text style={styles.tasaEditar}>Editar</Text>
            </Pressable>
          )}
        </View>
        {editandoEslogan ? (
          <TextInput
            style={styles.esloganInput}
            value={esloganBorrador}
            onChangeText={setEsloganBorrador}
            autoFocus
            onBlur={guardarEslogan}
            onSubmitEditing={guardarEslogan}
            placeholder="Ej: Tu remesa segura, hoy mismo."
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={styles.eslogan}>{perfil?.eslogan || (puedeGestionar ? 'Toca "Editar" para escribir un eslogan' : '—')}</Text>
        )}
      </View>

      <View style={[styles.card, cardShadow, styles.horarioCard]}>
        <View>
          <Text style={styles.miniLabel}>Horario de atención</Text>
          <Text style={styles.horarioValor}>
            {perfil?.horario_inicio && perfil?.horario_fin ? `${perfil.horario_inicio} – ${perfil.horario_fin}` : 'Sin definir'}
          </Text>
        </View>
        {puedeGestionar && (
          <Pressable onPress={() => router.push('/(operador-peru)/onboarding')}>
            <Text style={styles.tasaEditar}>Editar →</Text>
          </Pressable>
        )}
      </View>

      {puedeGestionar && (
        <View style={[styles.card, cardShadow, styles.tasaCard]}>
          <Text style={styles.tasaLabel}>Tasa de adquisición (lo que pagas tú por cada bolívar)</Text>
          <Text style={styles.tasaValor}>{tasa?.tasa_adquisicion ? `VES ${tasa.tasa_adquisicion}` : 'Sin publicar'}</Text>
          <Pressable onPress={() => router.push('/(operador-peru)/tasa')}>
            <Text style={styles.tasaEditar}>Actualizar tasa →</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.card, cardShadow, styles.tasaCard]}>
        <Text style={styles.tasaLabel}>Tasa del día (Soles → Bolívares)</Text>
        <Text style={styles.tasaValor}>{tasa ? `VES ${tasa.tasa_pen_ves}` : 'Sin publicar'}</Text>
        {puedeGestionar && (
          <Pressable onPress={() => router.push('/(operador-peru)/tasa')}>
            <Text style={styles.tasaEditar}>Actualizar tasa →</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.card, cardShadow, styles.tiempoRealCard]}>
        <Text style={styles.seccionTitulo}>Operaciones en tiempo real</Text>
        <View style={styles.tiempoRealFila}>
          <EstadoResumenItem titulo="En curso" n={totalesPorEstado.enCurso.n} montoPen={totalesPorEstado.enCurso.montoPen} montoVes={totalesPorEstado.enCurso.montoVes} />
          <EstadoResumenItem titulo="Realizadas (hoy)" n={totalesPorEstado.realizadas.n} montoPen={totalesPorEstado.realizadas.montoPen} montoVes={totalesPorEstado.realizadas.montoVes} />
          <EstadoResumenItem titulo="Por revisar" n={totalesPorEstado.porRevisar.n} montoPen={totalesPorEstado.porRevisar.montoPen} montoVes={totalesPorEstado.porRevisar.montoVes} alerta={totalesPorEstado.porRevisar.n > 0} />
        </View>
      </View>

      {puedeGestionar ? (
        <View style={[styles.card, cardShadow, styles.financieroCard]}>
          <Text style={styles.seccionTitulo}>Resumen financiero (hoy)</Text>
          <FinancieroItem label="Monto enviado al beneficiario" valor={`VES ${gananciaHoy.montoBeneficiarioVes.toFixed(2)}`} />
          <FinancieroItem label="Comisión Operador Venezuela" valor={`VES ${gananciaHoy.comisionVeTotalVes.toFixed(2)} · PEN ${gananciaHoy.comisionVeTotalPen.toFixed(2)}`} />
          <FinancieroItem label="Transferencia enviada al Operador Venezuela" valor={`VES ${gananciaHoy.transferenciaTotalVes.toFixed(2)}`} />
          <FinancieroItem label="Comisión equipo Perú" valor={`PEN ${gananciaHoy.comisionPeruTotalPen.toFixed(2)}`} />
          <FinancieroItem label="Ganancia bruta" valor={`PEN ${gananciaHoy.gananciaBrutaTotal.toFixed(2)} (${gananciaHoy.porcentajeBruta.toFixed(1)}%)`} />
          <FinancieroItem label="Ganancia neta" valor={`PEN ${gananciaHoy.gananciaNetaTotal.toFixed(2)} (${gananciaHoy.porcentajeNeta.toFixed(1)}%)`} destacado />
        </View>
      ) : (
        <View style={[styles.card, cardShadow, styles.financieroCard]}>
          <Text style={styles.seccionTitulo}>Mi comisión (hoy)</Text>
          <FinancieroItem
            label="Comisión ganada"
            valor={esVenezuela ? `VES ${gananciaHoy.miComisionVes.toFixed(2)} · PEN ${gananciaHoy.miComisionPen.toFixed(2)}` : `PEN ${gananciaHoy.miComisionPen.toFixed(2)}`}
            destacado
          />
        </View>
      )}

      {/* "En curso", "Realizadas hoy", "Por revisar" y (solo miembro)
          "Derivadas" comparten una fila de pestañas: solo una lista está
          desplegada a la vez, ahorrando espacio. */}
      <View style={styles.opsToggleRow}>
        <Pressable
          style={[styles.opsToggleBtn, vistaOperaciones === 'en_curso' && styles.opsToggleBtnActivo]}
          onPress={() => setVistaOperaciones('en_curso')}
        >
          <Text style={[styles.opsToggleTexto, vistaOperaciones === 'en_curso' && styles.opsToggleTextoActivo]}>
            En curso ({enCurso.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.opsToggleBtn, vistaOperaciones === 'realizadas' && styles.opsToggleBtnActivo]}
          onPress={() => setVistaOperaciones('realizadas')}
        >
          <Text style={[styles.opsToggleTexto, vistaOperaciones === 'realizadas' && styles.opsToggleTextoActivo]}>
            Realizadas (Hoy) ({realizadas.length})
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.opsToggleBtn,
            porRevisar.length > 0 && styles.opsToggleBtnAlerta,
            vistaOperaciones === 'por_revisar' && styles.opsToggleBtnActivo,
          ]}
          onPress={() => setVistaOperaciones('por_revisar')}
        >
          <Text style={[styles.opsToggleTexto, vistaOperaciones === 'por_revisar' && styles.opsToggleTextoActivo]}>
            Por revisar ({porRevisar.length})
          </Text>
        </Pressable>
        {esMiembroPe && (
          <Pressable
            style={[
              styles.opsToggleBtn,
              derivadas.length > 0 && styles.opsToggleBtnAlerta,
              vistaOperaciones === 'derivadas' && styles.opsToggleBtnActivo,
            ]}
            onPress={() => setVistaOperaciones('derivadas')}
          >
            <Text style={[styles.opsToggleTexto, vistaOperaciones === 'derivadas' && styles.opsToggleTextoActivo]}>
              Derivadas ({derivadas.length})
            </Text>
          </Pressable>
        )}
      </View>

      {vistaOperaciones === 'en_curso' ? (
        <>
          {enCurso.length === 0 && <Text style={styles.vacio}>No hay operaciones en curso.</Text>}
          <View style={styles.grid}>
            {enCurso.map((op) => (
              <OperationRow
                key={op.id}
                style={styles.gridItem}
                op={op}
                numero={numeracion.get(op.id)}
                nombreNegocio={perfil?.nombre_negocio || 'Remesas Perú-Venezuela'}
                puedeValidarPeru={!esVenezuela}
                puedeValidarVe={esVenezuela || (esPrincipal && puedeValidarVeAunSinSerElMismo)}
                onValidarPeru={() => validarPeru(op)}
                onValidarVe={(comprobanteUri, comprobanteExt) => validarVe(op, comprobanteUri, comprobanteExt)}
                validandoPeru={validando?.id === op.id && validando.tipo === 'peru'}
                validandoVe={validando?.id === op.id && validando.tipo === 've'}
                atendidoPor={atendidoPor(op)}
                atendidoPorTelefono={atendidoPorTelefono(op)}
                derivadaDePrincipal={op.derivada_de_principal}
                onDerivar={esPrincipal && !op.operador_peru_miembro_id ? () => abrirDerivacion(op) : undefined}
              />
            ))}
          </View>
        </>
      ) : vistaOperaciones === 'realizadas' ? (
        <>
          <View style={styles.seccionHeaderRow}>
            <Text style={styles.miniLabel}>Buscar en realizadas de hoy</Text>
            <Pressable style={styles.excelBtn} onPress={exportarExcel} disabled={exportando || realizadasFiltradas.length === 0}>
              {exportando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.excelBtnTexto}>Excel</Text>}
            </Pressable>
          </View>
          <TextInput
            style={styles.buscador}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre, teléfono, fecha, monto o año..."
            placeholderTextColor={colors.textMuted}
          />
          {realizadasFiltradas.length === 0 && <Text style={styles.vacio}>Sin resultados.</Text>}
          <View style={styles.grid}>
            {realizadasFiltradas.map((op) => (
              <OperationRow
                key={op.id}
                style={styles.gridItem}
                op={op}
                numero={numeracion.get(op.id)}
                nombreNegocio={perfil?.nombre_negocio || 'Remesas Perú-Venezuela'}
                puedeValidarPeru={false}
                puedeValidarVe={false}
                onValidarPeru={() => {}}
                onValidarVe={() => {}}
                validandoPeru={false}
                validandoVe={false}
                atendidoPor={atendidoPor(op)}
                atendidoPorTelefono={atendidoPorTelefono(op)}
                derivadaDePrincipal={op.derivada_de_principal}
              />
            ))}
          </View>
        </>
      ) : vistaOperaciones === 'derivadas' ? (
        <>
          <Text style={styles.derivadasTitulo}>OPERACIONES DERIVADAS</Text>
          <Text style={styles.derivadasSubtitulo}>Solicitudes que el Operador principal de Perú derivó a tu sesión.</Text>
          {derivadas.length === 0 && <Text style={styles.vacio}>No tienes operaciones derivadas.</Text>}
          <View style={styles.grid}>
            {derivadas.map((op) => (
              <OperationRow
                key={op.id}
                style={styles.gridItem}
                op={op}
                numero={numeracion.get(op.id)}
                nombreNegocio={perfil?.nombre_negocio || 'Remesas Perú-Venezuela'}
                puedeValidarPeru={true}
                puedeValidarVe={false}
                onValidarPeru={() => validarPeru(op)}
                onValidarVe={() => {}}
                validandoPeru={validando?.id === op.id && validando.tipo === 'peru'}
                validandoVe={false}
                atendidoPor={atendidoPor(op)}
                atendidoPorTelefono={atendidoPorTelefono(op)}
                derivadaDePrincipal={op.derivada_de_principal}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          {porRevisar.length === 0 && <Text style={styles.vacio}>No hay operaciones por revisar.</Text>}
          <View style={styles.grid}>
            {porRevisar.map((op) => (
              <OperationRow
                key={op.id}
                style={styles.gridItem}
                op={op}
                numero={numeracion.get(op.id)}
                nombreNegocio={perfil?.nombre_negocio || 'Remesas Perú-Venezuela'}
                puedeValidarPeru={false}
                puedeValidarVe={false}
                onValidarPeru={() => {}}
                onValidarVe={() => {}}
                validandoPeru={false}
                validandoVe={false}
                atendidoPor={atendidoPor(op)}
                atendidoPorTelefono={atendidoPorTelefono(op)}
                onResolverRevision={() => resolverRevision(op)}
                resolviendoRevision={resolviendoId === op.id}
              />
            ))}
          </View>
        </>
      )}

      {/* Modal de derivación: solo lo usa el Operador principal sobre sus
          propias solicitudes (las que todavía no atiende un miembro). */}
      <Modal visible={!!derivandoOp} transparent animationType="fade" onRequestClose={() => setDerivandoOp(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Derivar solicitud</Text>
            <Text style={styles.modalTexto}>
              {derivandoOp
                ? `¿A qué operador de Perú quieres derivar la solicitud de ${derivandoOp.cliente_nombre} (PEN ${derivandoOp.monto_pen.toFixed(2)})?`
                : ''}
            </Text>
            {miembros.length === 0 ? (
              <Text style={styles.vacio}>Todavía no tienes operadores de Perú en tu equipo para derivar.</Text>
            ) : (
              miembros.map((m) => {
                const seleccionado = derivandoMiembroId === m.id;
                return (
                  <Pressable key={m.id} style={[styles.miembroOpcion, seleccionado && styles.miembroOpcionActivo]} onPress={() => setDerivandoMiembroId(m.id)}>
                    <View style={styles.miembroOpcionDatos}>
                      <Text style={[styles.miembroOpcionNombre, seleccionado && { color: colors.text }]} numberOfLines={1}>{m.nombre}</Text>
                      <Text style={styles.miembroOpcionDato} numberOfLines={1}>{m.email}</Text>
                    </View>
                    {seleccionado && <Text style={styles.miembroOpcionCheck}>✓</Text>}
                  </Pressable>
                );
              })
            )}
            <View style={styles.modalAcciones}>
              <Pressable style={styles.modalCancelar} onPress={() => setDerivandoOp(null)}>
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmar, (!derivandoMiembroId || derivandoEnviando) && styles.modalConfirmarDeshabilitado]}
                disabled={!derivandoMiembroId || derivandoEnviando}
                onPress={confirmarDerivacion}
              >
                {derivandoEnviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.modalConfirmarTexto}>Derivar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FinancieroItem({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <View style={styles.financieroFila}>
      <Text style={styles.resumenLabel}>{label}</Text>
      <Text style={[styles.resumenValor, styles.resumenValorFlex, destacado && { color: colors.accent }]}>{valor}</Text>
    </View>
  );
}

function EstadoResumenItem({
  titulo,
  n,
  montoPen,
  montoVes,
  alerta,
}: {
  titulo: string;
  n: number;
  montoPen: number;
  montoVes: number;
  alerta?: boolean;
}) {
  return (
    <View style={[styles.estadoResumenItem, alerta && styles.estadoResumenItemAlerta]}>
      <Text style={styles.miniLabel}>{titulo}</Text>
      <Text style={styles.miniValor}>{n}</Text>
      <Text style={styles.estadoResumenMonto}>PEN {montoPen.toFixed(2)}</Text>
      <Text style={styles.estadoResumenMonto}>VES {montoVes.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  negocioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  negocioLogo: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.cardAlt },
  negocioNombre: { color: colors.accent, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  bienvenida: { color: colors.text, fontSize: 25, fontWeight: '800', marginBottom: -4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  tasaCard: { alignItems: 'flex-start', gap: 4, marginTop: 8 },
  tasaLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  tasaValor: { color: colors.text, fontSize: 39, fontWeight: '900', letterSpacing: -0.5 },
  tasaEditar: { color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 4 },
  miniLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  miniValor: { color: colors.text, fontSize: 23, fontWeight: '800' },
  horarioCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  horarioValor: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  esloganCard: { gap: 4 },
  esloganHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eslogan: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4, fontStyle: 'italic' },
  esloganInput: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 4 },
  tiempoRealCard: { gap: 8 },
  tiempoRealFila: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  estadoResumenItem: { flex: 1, minWidth: 100, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, gap: 2 },
  estadoResumenItemAlerta: { borderColor: colors.danger },
  estadoResumenMonto: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  financieroCard: { gap: 6 },
  financieroFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 },
  seccionTitulo: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  opsToggleRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  opsToggleBtn: {
    flex: 1,
    minWidth: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  opsToggleBtnActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  opsToggleBtnAlerta: { borderColor: colors.danger },
  opsToggleTexto: { color: colors.textMuted, fontWeight: '800', fontSize: 15, textTransform: 'uppercase', textAlign: 'center' },
  opsToggleTextoActivo: { color: colors.text },
  derivadasTitulo: { color: colors.warning, fontSize: 18, fontWeight: '900', marginTop: 10, letterSpacing: 0.5 },
  derivadasSubtitulo: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  excelBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  vacio: { color: colors.textMuted, fontSize: 15, fontStyle: 'italic' },
  // 1 columna en móvil; en pantallas anchas (operador en web/tablet) las
  // tarjetas se acomodan solas en 2-3 columnas gracias al flexWrap.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexGrow: 1, flexBasis: 340, minWidth: 300 },
  buscador: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.cardAlt,
  },
  resumenLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  resumenValor: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  resumenValorFlex: { textAlign: 'right' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 20, gap: 10, width: '100%', maxWidth: 420 },
  modalTitulo: { color: colors.text, fontSize: 21, fontWeight: '900' },
  modalTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 19 },
  miembroOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    gap: 8,
  },
  miembroOpcionActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  miembroOpcionDatos: { flex: 1, gap: 2 },
  miembroOpcionNombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  miembroOpcionDato: { color: colors.textMuted, fontSize: 13 },
  miembroOpcionCheck: { color: colors.success, fontWeight: '900' },
  modalAcciones: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  modalCancelarTexto: { color: colors.textMuted, fontWeight: '700' },
  modalConfirmar: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  modalConfirmarDeshabilitado: { opacity: 0.4 },
  modalConfirmarTexto: { color: colors.text, fontWeight: '700' },
});
