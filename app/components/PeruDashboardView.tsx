import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Switch, Image } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { PerfilNegocio, Tasa } from '../types/database';
import { OperationRow, OperationRowData, formatearTiempoRespuesta, FORMATTER_FECHA_HORA } from './OperationRow';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { hoyLocal, fechaLocalDe, yaCerroHoy } from '../lib/fechaLocal';
import { useAlertaSonora } from '../lib/useAlertaSonora';
import { LiveClock } from './LiveClock';
import { RoleTag } from './RoleTag';
import { colors, radius, cardShadow } from '../constants/theme';

// Panel del Operador Perú: bienvenida + tasa + rentabilidad + eslogan,
// "Operaciones en curso", "Operaciones realizadas" (con búsqueda) y resumen
// del día. Lo usan tanto (operador-peru)/index.tsx (control total) como
// (operador-venezuela)/index.tsx (`restringido`, solo puede tocar el check VE).
export function PeruDashboardView({
  operadorPeruId,
  nombreUsuarioActual,
  restringido,
  esMiembroPe = false,
  puedeValidarVeAunSinSerElMismo = true,
}: {
  operadorPeruId: string;
  nombreUsuarioActual: string;
  restringido: boolean;
  /** Miembro de equipo del Operador Perú (no el dueño): valida ambos checks y publica tasa, pero no gestiona el negocio ni el equipo. */
  esMiembroPe?: boolean;
  puedeValidarVeAunSinSerElMismo?: boolean;
}) {
  // Solo el dueño del negocio gestiona horario/eslogan/rentabilidad/equipo.
  const puedeGestionar = !restringido && !esMiembroPe;

  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilNegocio | null>(null);
  const [tasa, setTasa] = useState<Tasa | null>(null);
  const [operaciones, setOperaciones] = useState<OperationRowData[]>([]);
  const [validando, setValidando] = useState<{ id: string; tipo: 'peru' | 've' } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [editandoEslogan, setEditandoEslogan] = useState(false);
  const [esloganBorrador, setEsloganBorrador] = useState('');
  const [editandoRentabilidad, setEditandoRentabilidad] = useState(false);
  const [rentabilidadBorrador, setRentabilidadBorrador] = useState('');
  const [vistaOperaciones, setVistaOperaciones] = useState<'en_curso' | 'realizadas' | 'por_revisar'>('en_curso');
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);

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
    const [{ data: perfilData }, { data: tasaData }, { data: opsData }] = await Promise.all([
      supabase.from('perfil_negocio').select('*').eq('operador_peru_id', operadorPeruId).maybeSingle(),
      supabase
        .from('tasas')
        .select('*')
        .eq('publicada_por', operadorPeruId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('solicitudes')
        .select(
          '*, cliente:usuarios!solicitudes_cliente_id_fkey(nombre, telefono, email), validador_peru:usuarios!solicitudes_validado_peru_por_fkey(nombre), validador_ve:usuarios!solicitudes_validado_ve_por_fkey(nombre)'
        )
        .eq('negocio_operador_peru_id', operadorPeruId)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    setPerfil(perfilData as PerfilNegocio | null);
    setTasa(tasaData as Tasa | null);
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
        }))
      );
    }
    setCargando(false);
  }, [operadorPeruId]);

  useEffect(() => {
    cargar();
    const channel = supabase
      .channel(`peru-dashboard-${operadorPeruId}`)
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
  }, [cargar, operadorPeruId]);

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
        (o) => (restringido ? o.check_deposito_peru && !o.check_deposito_ve : !o.check_deposito_peru) || o.en_revision
      ),
    [operaciones, restringido]
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
    if (restringido) return;
    const completadosAhora = new Set(operaciones.filter((o) => o.check_deposito_ve).map((o) => o.id));
    if (completadosConocidosRef.current === null) {
      completadosConocidosRef.current = completadosAhora;
      return;
    }
    const hayNuevoCompletado = [...completadosAhora].some((id) => !completadosConocidosRef.current!.has(id));
    if (hayNuevoCompletado) reproducirAlerta();
    completadosConocidosRef.current = completadosAhora;
  }, [operaciones, restringido, reproducirAlerta]);

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

  // `realizadas` ya está acotado a hoy (ver arriba), así que el resumen es
  // directamente sobre esa lista.
  const resumenHoy = useMemo(() => {
    const montoTotal = realizadas.reduce((acc, o) => acc + o.monto_pen, 0);
    const rentabilidadPct = perfil?.rentabilidad_pct ?? 0;
    return {
      nOps: realizadas.length,
      montoTotal,
      ganancia: montoTotal * (rentabilidadPct / 100),
    };
  }, [realizadas, perfil]);

  // El aviso al cliente/beneficiario ya no se abre acá manualmente: al
  // marcar cada check, un trigger en la base de datos dispara el envío
  // automático por Telegram (ver supabase/migrations/0040_telegram_notificaciones.sql
  // y supabase/functions/telegram-notificar-deposito).
  const validarPeru = async (op: OperationRowData) => {
    setValidando({ id: op.id, tipo: 'peru' });
    const { error } = await supabase.rpc('validar_deposito_peru', { p_solicitud_id: op.id });
    setValidando(null);
    if (error) return;
    cargar();
  };

  const validarVe = async (op: OperationRowData, comprobanteUri: string, comprobanteExt: string) => {
    setValidando({ id: op.id, tipo: 've' });
    try {
      const path = `${op.id}/comprobante-vz.${comprobanteExt}`;
      const blob = await (await fetch(comprobanteUri)).blob();
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

      const { error } = await supabase.rpc('validar_deposito_venezuela', {
        p_solicitud_id: op.id,
        p_comprobante_url: publicUrl.publicUrl,
      });
      if (error) throw error;

      cargar();
    } finally {
      setValidando(null);
    }
  };

  const resolverRevision = async (op: OperationRowData) => {
    setResolviendoId(op.id);
    await supabase.rpc('resolver_revision_beneficiario', { p_solicitud_id: op.id });
    setResolviendoId(null);
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

  const guardarRentabilidad = async () => {
    const valor = Number(rentabilidadBorrador.replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0) return;
    await supabase.from('perfil_negocio').update({ rentabilidad_pct: valor }).eq('operador_peru_id', operadorPeruId);
    setEditandoRentabilidad(false);
    cargar();
  };

  const guardarCompartirRentabilidad = async (campo: 'compartir_rentabilidad_ve' | 'compartir_rentabilidad_pe_miembros', valor: boolean) => {
    await supabase.from('perfil_negocio').update({ [campo]: valor }).eq('operador_peru_id', operadorPeruId);
    cargar();
  };

  const puedeVerRentabilidad =
    puedeGestionar || (restringido ? (perfil?.compartir_rentabilidad_ve ?? false) : (perfil?.compartir_rentabilidad_pe_miembros ?? false));

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag
        rol={restringido ? 'operador_venezuela' : 'operador_peru'}
        etiqueta={restringido ? 'Operador Venezuela · Solo lectura' : esMiembroPe ? 'Operador Perú · Miembro de equipo' : undefined}
      />
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

      <View style={[styles.card, cardShadow, styles.tasaCard]}>
        <Text style={styles.tasaLabel}>Tasa del día (Soles → Bolívares)</Text>
        <Text style={styles.tasaValor}>{tasa ? `Bs ${tasa.tasa_pen_ves}` : 'Sin publicar'}</Text>
        {!restringido && (
          <Pressable onPress={() => router.push('/(operador-peru)/tasa')}>
            <Text style={styles.tasaEditar}>Actualizar tasa →</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.filaDos}>
        <View style={[styles.card, cardShadow, styles.miniCard]}>
          <Text style={styles.miniLabel}>Rentabilidad</Text>
          {!puedeVerRentabilidad ? (
            <Text style={styles.miniValor}>— Privado</Text>
          ) : editandoRentabilidad ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={rentabilidadBorrador}
                onChangeText={setRentabilidadBorrador}
                keyboardType="decimal-pad"
                autoFocus
                onBlur={guardarRentabilidad}
                onSubmitEditing={guardarRentabilidad}
              />
              <Text style={styles.miniValor}>%</Text>
            </View>
          ) : (
            <Pressable
              disabled={!puedeGestionar}
              onPress={() => {
                setRentabilidadBorrador(String(perfil?.rentabilidad_pct ?? 0));
                setEditandoRentabilidad(true);
              }}
            >
              <Text style={styles.miniValor}>{perfil?.rentabilidad_pct ?? 0}%</Text>
            </Pressable>
          )}
        </View>
        <View style={[styles.card, cardShadow, styles.miniCard]}>
          <Text style={styles.miniLabel}>Operaciones hoy</Text>
          <Text style={styles.miniValor}>{resumenHoy.nOps}</Text>
        </View>
      </View>

      {puedeGestionar && (
        <View style={[styles.card, cardShadow, styles.horarioCard]}>
          <Text style={styles.switchLabelCompartir}>Compartir rentabilidad con el Operador Venezuela</Text>
          <Switch
            value={perfil?.compartir_rentabilidad_ve ?? false}
            onValueChange={(v) => guardarCompartirRentabilidad('compartir_rentabilidad_ve', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      )}

      {puedeGestionar && (
        <View style={[styles.card, cardShadow, styles.horarioCard]}>
          <Text style={styles.switchLabelCompartir}>Compartir rentabilidad con los miembros Operador Perú</Text>
          <Switch
            value={perfil?.compartir_rentabilidad_pe_miembros ?? false}
            onValueChange={(v) => guardarCompartirRentabilidad('compartir_rentabilidad_pe_miembros', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      )}

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

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.miniLabel}>Eslogan (sesión cliente)</Text>
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
          <Pressable
            disabled={!puedeGestionar}
            onPress={() => {
              setEsloganBorrador(perfil?.eslogan ?? '');
              setEditandoEslogan(true);
            }}
          >
            <Text style={styles.eslogan}>{perfil?.eslogan || (puedeGestionar ? 'Toca para escribir un eslogan' : '—')}</Text>
          </Pressable>
        )}
      </View>

      {/* "En curso" y "Realizadas hoy" comparten una fila de pestañas: solo
          una lista está desplegada a la vez (una debajo de la otra),
          ahorrando espacio en vez de mostrar las dos siempre abiertas. */}
      <View style={styles.opsToggleRow}>
        <Pressable
          style={[styles.opsToggleBtn, vistaOperaciones === 'en_curso' && styles.opsToggleBtnActivo]}
          onPress={() => setVistaOperaciones('en_curso')}
        >
          <Text style={[styles.opsToggleTexto, vistaOperaciones === 'en_curso' && styles.opsToggleTextoActivo]}>
            Operaciones en curso ({enCurso.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.opsToggleBtn, vistaOperaciones === 'realizadas' && styles.opsToggleBtnActivo]}
          onPress={() => setVistaOperaciones('realizadas')}
        >
          <Text style={[styles.opsToggleTexto, vistaOperaciones === 'realizadas' && styles.opsToggleTextoActivo]}>
            Operaciones realizadas (Hoy) ({realizadas.length})
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
            Operaciones por revisar ({porRevisar.length})
          </Text>
        </Pressable>
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
                puedeValidarPeru={!restringido}
                puedeValidarVe={!restringido || puedeValidarVeAunSinSerElMismo}
                onValidarPeru={() => validarPeru(op)}
                onValidarVe={(comprobanteUri, comprobanteExt) => validarVe(op, comprobanteUri, comprobanteExt)}
                validandoPeru={validando?.id === op.id && validando.tipo === 'peru'}
                validandoVe={validando?.id === op.id && validando.tipo === 've'}
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
                onResolverRevision={() => resolverRevision(op)}
                resolviendoRevision={resolviendoId === op.id}
              />
            ))}
          </View>
        </>
      )}

      <View style={[styles.card, cardShadow, styles.resumenCard]}>
        <Text style={styles.seccionTitulo}>Resumen de hoy</Text>
        <View style={styles.resumenRow}>
          <ResumenItem label="Operaciones" valor={String(resumenHoy.nOps)} />
          <ResumenItem label="Monto recibido" valor={`S/ ${resumenHoy.montoTotal.toFixed(2)}`} />
          {puedeVerRentabilidad && <ResumenItem label="Ganancia" valor={`S/ ${resumenHoy.ganancia.toFixed(2)}`} destacado />}
        </View>
      </View>
    </ScrollView>
  );
}

function ResumenItem({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <View style={styles.resumenItem}>
      <Text style={styles.resumenLabel}>{label}</Text>
      <Text style={[styles.resumenValor, destacado && { color: colors.accent }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  negocioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  negocioLogo: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.cardAlt },
  negocioNombre: { color: colors.accent, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  bienvenida: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: -4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  tasaCard: { alignItems: 'flex-start', gap: 4, marginTop: 8 },
  tasaLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  tasaValor: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  tasaEditar: { color: colors.accent, fontSize: 12, fontWeight: '700', marginTop: 4 },
  filaDos: { flexDirection: 'row', gap: 12 },
  miniCard: { flex: 1, gap: 4 },
  miniLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  miniValor: { color: colors.text, fontSize: 20, fontWeight: '800' },
  horarioCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  horarioValor: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  switchLabelCompartir: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  editRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  editInput: { color: colors.text, fontSize: 20, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: colors.primary, minWidth: 50 },
  eslogan: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4, fontStyle: 'italic' },
  esloganInput: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 4 },
  seccionTitulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  opsToggleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  opsToggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  opsToggleBtnActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  opsToggleBtnAlerta: { borderColor: colors.danger },
  opsToggleTexto: { color: colors.textMuted, fontWeight: '800', fontSize: 16, textTransform: 'uppercase' },
  opsToggleTextoActivo: { color: colors.text },
  excelBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
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
    fontSize: 14,
    backgroundColor: colors.cardAlt,
  },
  resumenCard: { marginTop: 8, gap: 8 },
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resumenItem: { alignItems: 'center', flex: 1 },
  resumenLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  resumenValor: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
});
