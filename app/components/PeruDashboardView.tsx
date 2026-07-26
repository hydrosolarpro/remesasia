import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { construirEnlaceEntrada } from '../lib/invitaciones';
import { PerfilNegocio, Tasa, OperadorVenezuelaPerfil, OperadorPeruMiembro } from '../types/database';
import { OperationRow, OperationRowData, formatearTiempoRespuesta, FORMATTER_FECHA_HORA } from './OperationRow';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { LiveClock } from './LiveClock';
import { RoleTag } from './RoleTag';
import { colors, radius, cardShadow } from '../constants/theme';

const HOY = () => new Date().toISOString().slice(0, 10);

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
  const [veList, setVeList] = useState<OperadorVenezuelaPerfil[]>([]);
  const [nuevoVe, setNuevoVe] = useState({ nombre: '', telefono: '', email: '' });
  const [guardandoVe, setGuardandoVe] = useState(false);
  const [enlaceVeCopiado, setEnlaceVeCopiado] = useState(false);
  const [errorVe, setErrorVe] = useState<string | null>(null);
  const [peList, setPeList] = useState<OperadorPeruMiembro[]>([]);
  const [nuevoPe, setNuevoPe] = useState({ nombre: '', telefono: '', email: '' });
  const [guardandoPe, setGuardandoPe] = useState(false);
  const [enlacePeCopiado, setEnlacePeCopiado] = useState(false);
  const [errorPe, setErrorPe] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [{ data: perfilData }, { data: tasaData }, { data: opsData }, { data: veListData }, { data: peListData }] = await Promise.all([
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
      supabase.from('operador_venezuela_perfil').select('*').eq('operador_peru_id', operadorPeruId).order('created_at', { ascending: true }),
      supabase.from('operador_peru_miembro').select('*').eq('operador_peru_id', operadorPeruId).order('created_at', { ascending: true }),
    ]);

    setPerfil(perfilData as PerfilNegocio | null);
    setTasa(tasaData as Tasa | null);
    setVeList((veListData as OperadorVenezuelaPerfil[] | null) ?? []);
    setPeList((peListData as OperadorPeruMiembro[] | null) ?? []);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, () => cargar())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargar, operadorPeruId]);

  const enCurso = useMemo(() => operaciones.filter((o) => !o.check_deposito_ve), [operaciones]);
  const realizadas = useMemo(() => operaciones.filter((o) => o.check_deposito_ve), [operaciones]);

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

  const resumenHoy = useMemo(() => {
    const hoy = HOY();
    const deHoy = realizadas.filter((o) => (o.check_deposito_ve_at ?? '').slice(0, 10) === hoy);
    const montoTotal = deHoy.reduce((acc, o) => acc + o.monto_pen, 0);
    const rentabilidadPct = perfil?.rentabilidad_pct ?? 0;
    return {
      nOps: deHoy.length,
      montoTotal,
      ganancia: montoTotal * (rentabilidadPct / 100),
    };
  }, [realizadas, perfil]);

  const validarPeru = async (id: string) => {
    setValidando({ id, tipo: 'peru' });
    const { error } = await supabase.rpc('validar_deposito_peru', { p_solicitud_id: id });
    setValidando(null);
    if (!error) cargar();
  };

  const validarVe = async (id: string, comprobanteUri: string, comprobanteExt: string) => {
    setValidando({ id, tipo: 've' });
    try {
      const path = `${id}/comprobante-vz.${comprobanteExt}`;
      const blob = await (await fetch(comprobanteUri)).blob();
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

      const { error } = await supabase.rpc('validar_deposito_venezuela', {
        p_solicitud_id: id,
        p_comprobante_url: publicUrl.publicUrl,
      });
      if (error) throw error;
      cargar();
    } finally {
      setValidando(null);
    }
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

  // Agrega un nuevo miembro de Operador Venezuela y copia el enlace de
  // entrada — al abrirlo e iniciar sesión con Google usando ese mismo
  // correo, su cuenta se vincula sola como Operador Venezuela de este
  // negocio (ver trigger handle_new_user). Ahora se permiten varios.
  const agregarVeYCopiarEnlace = async () => {
    if (!nuevoVe.nombre.trim() || !nuevoVe.email.trim()) return;
    setGuardandoVe(true);
    setErrorVe(null);
    setEnlaceVeCopiado(false);
    try {
      const { error } = await supabase.from('operador_venezuela_perfil').insert({
        operador_peru_id: operadorPeruId,
        nombre: nuevoVe.nombre.trim(),
        telefono: nuevoVe.telefono.trim() || null,
        email: nuevoVe.email.trim().toLowerCase(),
      });
      if (error) throw error;
      await Clipboard.setStringAsync(construirEnlaceEntrada());
      setEnlaceVeCopiado(true);
      setTimeout(() => setEnlaceVeCopiado(false), 2000);
      setNuevoVe({ nombre: '', telefono: '', email: '' });
      cargar();
    } catch (err) {
      setErrorVe(err instanceof Error ? err.message : 'No se pudo agregar.');
    } finally {
      setGuardandoVe(false);
    }
  };

  const editarVe = async (id: string, campo: 'nombre' | 'telefono' | 'email', valor: string) => {
    setVeList((prev) => prev.map((v) => (v.id === id ? { ...v, [campo]: valor } : v)));
    await supabase
      .from('operador_venezuela_perfil')
      .update({ [campo]: campo === 'email' ? valor.trim().toLowerCase() : valor.trim() || null })
      .eq('id', id);
  };

  const eliminarVe = async (id: string) => {
    await supabase.from('operador_venezuela_perfil').delete().eq('id', id);
    cargar();
  };

  // Igual que arriba, pero para miembros de equipo del Operador Perú
  // (validan ambos checks y publican tasa, no gestionan el negocio).
  const agregarPeYCopiarEnlace = async () => {
    if (!nuevoPe.nombre.trim() || !nuevoPe.email.trim()) return;
    setGuardandoPe(true);
    setErrorPe(null);
    setEnlacePeCopiado(false);
    try {
      const { error } = await supabase.from('operador_peru_miembro').insert({
        operador_peru_id: operadorPeruId,
        nombre: nuevoPe.nombre.trim(),
        telefono: nuevoPe.telefono.trim() || null,
        email: nuevoPe.email.trim().toLowerCase(),
      });
      if (error) throw error;
      await Clipboard.setStringAsync(construirEnlaceEntrada());
      setEnlacePeCopiado(true);
      setTimeout(() => setEnlacePeCopiado(false), 2000);
      setNuevoPe({ nombre: '', telefono: '', email: '' });
      cargar();
    } catch (err) {
      setErrorPe(err instanceof Error ? err.message : 'No se pudo agregar.');
    } finally {
      setGuardandoPe(false);
    }
  };

  const editarPe = async (id: string, campo: 'nombre' | 'telefono' | 'email', valor: string) => {
    setPeList((prev) => prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
    await supabase
      .from('operador_peru_miembro')
      .update({ [campo]: campo === 'email' ? valor.trim().toLowerCase() : valor.trim() || null })
      .eq('id', id);
  };

  const eliminarPe = async (id: string) => {
    await supabase.from('operador_peru_miembro').delete().eq('id', id);
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
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.miniLabel}>Operadores Venezuela ({veList.length})</Text>
          {veList.map((v) => (
            <MiembroEditable
              key={v.id}
              nombre={v.nombre}
              telefono={v.telefono ?? ''}
              email={v.email ?? ''}
              onCambiarNombre={(t) => editarVe(v.id, 'nombre', t)}
              onCambiarTelefono={(t) => editarVe(v.id, 'telefono', t)}
              onCambiarEmail={(t) => editarVe(v.id, 'email', t)}
              onEliminar={() => eliminarVe(v.id)}
            />
          ))}

          <Text style={[styles.miniLabel, styles.nuevoMiembroLabel]}>Agregar nuevo</Text>
          <TextInput
            style={styles.veInput}
            value={nuevoVe.nombre}
            onChangeText={(t) => setNuevoVe((v) => ({ ...v, nombre: t }))}
            placeholder="Nombre completo"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.veInput}
            value={nuevoVe.telefono}
            onChangeText={(t) => setNuevoVe((v) => ({ ...v, telefono: t }))}
            placeholder="Teléfono"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.veInput}
            value={nuevoVe.email}
            onChangeText={(t) => setNuevoVe((v) => ({ ...v, email: t }))}
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
          />
          {errorVe && <Text style={styles.errorTexto}>{errorVe}</Text>}
          <Pressable
            style={styles.veBtn}
            onPress={agregarVeYCopiarEnlace}
            disabled={guardandoVe || !nuevoVe.nombre.trim() || !nuevoVe.email.trim()}
          >
            {guardandoVe ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.veBtnTexto}>{enlaceVeCopiado ? '✓ Enlace copiado' : 'Agregar y copiar enlace de invitación'}</Text>
            )}
          </Pressable>
        </View>
      )}

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
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.miniLabel}>Operadores Perú — equipo ({peList.length})</Text>
          <Text style={styles.cardTextoChico}>
            Miembros que acompañan a la cuenta principal: pueden validar depósitos y publicar la tasa, sin gestionar el equipo ni la
            suscripción.
          </Text>
          {peList.map((p) => (
            <MiembroEditable
              key={p.id}
              nombre={p.nombre}
              telefono={p.telefono ?? ''}
              email={p.email}
              onCambiarNombre={(t) => editarPe(p.id, 'nombre', t)}
              onCambiarTelefono={(t) => editarPe(p.id, 'telefono', t)}
              onCambiarEmail={(t) => editarPe(p.id, 'email', t)}
              onEliminar={() => eliminarPe(p.id)}
            />
          ))}

          <Text style={[styles.miniLabel, styles.nuevoMiembroLabel]}>Agregar nuevo</Text>
          <TextInput
            style={styles.veInput}
            value={nuevoPe.nombre}
            onChangeText={(t) => setNuevoPe((v) => ({ ...v, nombre: t }))}
            placeholder="Nombre completo"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.veInput}
            value={nuevoPe.telefono}
            onChangeText={(t) => setNuevoPe((v) => ({ ...v, telefono: t }))}
            placeholder="Teléfono"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.veInput}
            value={nuevoPe.email}
            onChangeText={(t) => setNuevoPe((v) => ({ ...v, email: t }))}
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
          />
          {errorPe && <Text style={styles.errorTexto}>{errorPe}</Text>}
          <Pressable
            style={styles.veBtn}
            onPress={agregarPeYCopiarEnlace}
            disabled={guardandoPe || !nuevoPe.nombre.trim() || !nuevoPe.email.trim()}
          >
            {guardandoPe ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.veBtnTexto}>{enlacePeCopiado ? '✓ Enlace copiado' : 'Agregar y copiar enlace de invitación'}</Text>
            )}
          </Pressable>
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

      <Text style={styles.seccionTitulo}>Operaciones en curso ({enCurso.length})</Text>
      {enCurso.length === 0 && <Text style={styles.vacio}>No hay operaciones en curso.</Text>}
      <View style={styles.grid}>
        {enCurso.map((op) => (
          <OperationRow
            key={op.id}
            style={styles.gridItem}
            op={op}
            numero={numeracion.get(op.id)}
            puedeValidarPeru={!restringido}
            puedeValidarVe={!restringido || puedeValidarVeAunSinSerElMismo}
            onValidarPeru={() => validarPeru(op.id)}
            onValidarVe={(comprobanteUri, comprobanteExt) => validarVe(op.id, comprobanteUri, comprobanteExt)}
            validandoPeru={validando?.id === op.id && validando.tipo === 'peru'}
            validandoVe={validando?.id === op.id && validando.tipo === 've'}
          />
        ))}
      </View>

      <View style={styles.seccionHeaderRow}>
        <Text style={styles.seccionTitulo}>Operaciones realizadas ({realizadas.length})</Text>
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
            puedeValidarPeru={false}
            puedeValidarVe={false}
            onValidarPeru={() => {}}
            onValidarVe={() => {}}
            validandoPeru={false}
            validandoVe={false}
          />
        ))}
      </View>

      <View style={[styles.card, cardShadow, styles.resumenCard]}>
        <Text style={styles.seccionTitulo}>Resumen de hoy</Text>
        <View style={styles.resumenRow}>
          <ResumenItem label="Operaciones" valor={String(resumenHoy.nOps)} />
          <ResumenItem label="Monto recibido" valor={`S/ ${resumenHoy.montoTotal.toFixed(2)}`} />
          <ResumenItem label="Ganancia" valor={`S/ ${resumenHoy.ganancia.toFixed(2)}`} destacado />
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

// Fila editable para un miembro de equipo (VE o Perú): nombre/teléfono/
// correo editables in-line (se guardan al perder el foco) + eliminar.
function MiembroEditable({
  nombre,
  telefono,
  email,
  onCambiarNombre,
  onCambiarTelefono,
  onCambiarEmail,
  onEliminar,
}: {
  nombre: string;
  telefono: string;
  email: string;
  onCambiarNombre: (v: string) => void;
  onCambiarTelefono: (v: string) => void;
  onCambiarEmail: (v: string) => void;
  onEliminar: () => void;
}) {
  const [nombreLocal, setNombreLocal] = useState(nombre);
  const [telefonoLocal, setTelefonoLocal] = useState(telefono);
  const [emailLocal, setEmailLocal] = useState(email);

  return (
    <View style={styles.miembroBloque}>
      <View style={styles.miembroHeaderRow}>
        <TextInput
          style={[styles.veInput, styles.miembroInputNombre]}
          value={nombreLocal}
          onChangeText={setNombreLocal}
          onBlur={() => nombreLocal.trim() && onCambiarNombre(nombreLocal)}
          placeholderTextColor={colors.textMuted}
        />
        <Pressable onPress={onEliminar} style={styles.miembroEliminarBtn}>
          <Text style={styles.miembroEliminarTexto}>✕</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.veInput}
        value={telefonoLocal}
        onChangeText={setTelefonoLocal}
        onBlur={() => onCambiarTelefono(telefonoLocal)}
        keyboardType="phone-pad"
        placeholder="Teléfono"
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={styles.veInput}
        value={emailLocal}
        onChangeText={setEmailLocal}
        onBlur={() => emailLocal.trim() && onCambiarEmail(emailLocal)}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
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
  veInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    marginTop: 8,
    backgroundColor: colors.cardAlt,
  },
  veBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 10 },
  veBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 13 },
  cardTextoChico: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  nuevoMiembroLabel: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  errorTexto: { color: colors.danger, fontSize: 12, marginTop: 6 },
  miembroBloque: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  miembroHeaderRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  miembroInputNombre: { flex: 1, marginTop: 0 },
  miembroEliminarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miembroEliminarTexto: { color: colors.danger, fontWeight: '800', fontSize: 14 },
  editRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  editInput: { color: colors.text, fontSize: 20, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: colors.primary, minWidth: 50 },
  eslogan: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4, fontStyle: 'italic' },
  esloganInput: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4, borderBottomWidth: 1, borderBottomColor: colors.primary, paddingVertical: 4 },
  seccionTitulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
