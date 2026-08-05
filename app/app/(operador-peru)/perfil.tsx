import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Modal, Linking, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import {
  diasRestantesDemo,
  fechaFinDemo,
  diasRestantesPeriodo,
  fechaVencimientoPeriodo,
  obtenerLimitesEquipo,
  obtenerLimitesPlan,
  siguientesPlanes,
  planDesdeMonto,
  planLabel,
} from '../../lib/plan';
import { useEstadoPlanNegocio } from '../../lib/useEstadoPlanNegocio';
import { FormularioSolicitudPlan } from '../../components/FormularioSolicitudPlan';
import { PlanesInfo } from '../../components/PlanesInfo';
import { Collapsible } from '../../components/Collapsible';
import { ClientesMiembroList } from '../../components/ClientesMiembroList';
import { OperadorVenezuelaPerfil, OperadorPeruMiembro, Usuario } from '../../types/database';
import { resolverContextoOperador } from '../../lib/sesionOperador';
import { construirEnlaceWhatsAppGenerico } from '../../lib/whatsapp';
import { colors, radius, cardShadow } from '../../constants/theme';

const FORMATTER_FECHA = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function Perfil() {
  const { usuario } = useAuth();
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [miembroId, setMiembroId] = useState<string | null>(null);
  const [principal, setPrincipal] = useState<Usuario | null>(null);

  // Equipos (solo los carga el Operador principal)
  const [veList, setVeList] = useState<OperadorVenezuelaPerfil[]>([]);
  const [peList, setPeList] = useState<OperadorPeruMiembro[]>([]);
  const [clientesPorMiembro, setClientesPorMiembro] = useState<Record<string, number>>({});
  // Filas completas (no solo el conteo) para desplegar la lista de clientes
  // de cada miembro dentro de su tarjeta -- ver ClientesMiembroList.
  const [clientesNegocio, setClientesNegocio] = useState<Usuario[]>([]);

  const [agregandoVe, setAgregandoVe] = useState(false);
  const [veNombre, setVeNombre] = useState('');
  const [veTelefono, setVeTelefono] = useState('');
  const [veEmail, setVeEmail] = useState('');
  const [guardandoVe, setGuardandoVe] = useState(false);
  const [errorVe, setErrorVe] = useState<string | null>(null);

  const [agregandoPe, setAgregandoPe] = useState(false);
  const [peNombre, setPeNombre] = useState('');
  const [peTelefono, setPeTelefono] = useState('');
  const [peEmail, setPeEmail] = useState('');
  const [guardandoPe, setGuardandoPe] = useState(false);
  const [errorPe, setErrorPe] = useState<string | null>(null);

  // Asignación de miembros de Perú a cada Operador de Venezuela
  const [asignandoVe, setAsignandoVe] = useState<OperadorVenezuelaPerfil | null>(null);

  // Miembro de Perú: su % de comisión (asignado por el principal, solo lectura acá)
  const [miembroRow, setMiembroRow] = useState<OperadorPeruMiembro | null>(null);
  // VE asignado al miembro (se muestra solo lectura)
  const [miVe, setMiVe] = useState<OperadorVenezuelaPerfil | null>(null);

  const [solicitandoPlan, setSolicitandoPlan] = useState<string | null>(null);
  const { periodoVerificado } = useEstadoPlanNegocio(negocioId);
  // Plan que el Operador principal eligió y ya envió a pagar (pendiente de
  // que el administrador lo verifique) -- se muestra aparte de "TU PLAN"
  // (el plan vigente) para que quede claro cuál es el plan que eligió
  // mientras el administrador todavía no lo confirma.
  const [pagoPeriodoActual, setPagoPeriodoActual] = useState<{ periodo: string; monto: number; estado: string } | null>(null);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  const cargarContexto = useCallback(async () => {
    if (!usuario) return;
    const ctx = await resolverContextoOperador(usuario);
    if (!ctx.negocioId) return;
    setNegocioId(ctx.negocioId);
    setEsPrincipal(ctx.tipo === 'principal');
    setMiembroId(ctx.miembroId);

    // Datos del Operador principal de Perú (siempre visibles, sin editar)
    const { data: principalData } = await supabase.from('usuarios').select('*').eq('id', ctx.negocioId).maybeSingle();
    setPrincipal(principalData as Usuario | null);

    if (ctx.tipo === 'principal') {
      cargarEquipos(ctx.negocioId);
      const periodo = new Date().toISOString().slice(0, 7);
      const { data: pago } = await supabase
        .from('pagos_suscripcion')
        .select('periodo, monto, estado')
        .eq('operador_peru_id', usuario.id)
        .eq('periodo', periodo)
        .maybeSingle();
      setPagoPeriodoActual(pago as { periodo: string; monto: number; estado: string } | null);
    } else if (ctx.tipo === 'miembro' && ctx.miembroId) {
      cargarMiembro(ctx.miembroId, ctx.negocioId);
    }
  }, [usuario]);

  const cargarEquipos = useCallback(async (negocioIdParam: string) => {
    const [veResult, peResult, clientesResult] = await Promise.all([
      supabase.from('operador_venezuela_perfil').select('*').eq('operador_peru_id', negocioIdParam).order('created_at', { ascending: true }),
      supabase.from('operador_peru_miembro').select('*').eq('operador_peru_id', negocioIdParam).order('created_at', { ascending: true }),
      supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'cliente')
        .eq('negocio_operador_peru_id', negocioIdParam)
        .is('eliminado_at', null)
        .order('created_at', { ascending: false }),
    ]);
    setVeList((veResult.data as OperadorVenezuelaPerfil[] | null) ?? []);
    setPeList((peResult.data as OperadorPeruMiembro[] | null) ?? []);
    const clientes = (clientesResult.data as Usuario[] | null) ?? [];
    setClientesNegocio(clientes);
    const conteo: Record<string, number> = {};
    clientes.forEach((c) => {
      if (c.invitado_por_operador_miembro_id) {
        conteo[c.invitado_por_operador_miembro_id] = (conteo[c.invitado_por_operador_miembro_id] ?? 0) + 1;
      }
    });
    setClientesPorMiembro(conteo);
  }, []);

  const cargarMiembro = useCallback(async (miembroIdParam: string, negocioIdParam: string) => {
    const { data: m } = await supabase.from('operador_peru_miembro').select('*').eq('id', miembroIdParam).maybeSingle();
    if (m) {
      setMiembroRow(m as OperadorPeruMiembro);
      if (m.operador_venezuela_id) {
        const { data: ve } = await supabase
          .from('operador_venezuela_perfil')
          .select('*')
          .eq('id', m.operador_venezuela_id)
          .maybeSingle();
        setMiVe((ve as OperadorVenezuelaPerfil | null) ?? null);
      } else {
        setMiVe(null);
      }
    }
  }, []);

  useEffect(() => {
    cargarContexto();
  }, [cargarContexto]);

  // El vínculo a la sesión real se hace por correo (ver
  // vincular_cuenta_pendiente): si esta fila ya estaba vinculada
  // (usuario_id) y se le cambia el correo, hay que desvincularla también,
  // o la fila queda mostrando un correo distinto al de la cuenta que
  // realmente tiene la sesión (el bug de "operadores invertidos").
  const editarVe = async (id: string, campo: 'nombre' | 'telefono' | 'email', valor: string) => {
    const filaActual = veList.find((v) => v.id === id);
    const valorNormalizado = campo === 'email' ? valor.trim().toLowerCase() : valor.trim() || null;
    const desvincular = campo === 'email' && !!filaActual?.usuario_id && valorNormalizado !== filaActual.email;
    setVeList((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [campo]: valorNormalizado, ...(desvincular ? { usuario_id: null } : {}) } : v))
    );
    await supabase
      .from('operador_venezuela_perfil')
      .update({ [campo]: valorNormalizado, ...(desvincular ? { usuario_id: null } : {}) })
      .eq('id', id);
  };

  const eliminarVe = async (id: string) => {
    await supabase.from('operador_venezuela_perfil').delete().eq('id', id);
    if (negocioId) cargarEquipos(negocioId);
  };

  // % de comisión: solo lo introduce/edita el operador principal (ver
  // Calculos-tasas-dinero-comisiones.md, C1/C2). Se guarda como número
  // (0-100), aceptando coma o punto decimal.
  const editarComisionVe = async (id: string, valor: string) => {
    const pct = Number(valor.replace(',', '.'));
    if (!Number.isFinite(pct)) return;
    setVeList((prev) => prev.map((v) => (v.id === id ? { ...v, comision_pct: pct } : v)));
    await supabase.from('operador_venezuela_perfil').update({ comision_pct: pct }).eq('id', id);
  };

  const editarPe = async (id: string, campo: 'nombre' | 'telefono' | 'email', valor: string) => {
    const filaActual = peList.find((p) => p.id === id);
    const valorNormalizado = campo === 'email' ? valor.trim().toLowerCase() : valor.trim() || null;
    const desvincular = campo === 'email' && !!filaActual?.usuario_id && valorNormalizado !== filaActual.email;
    setPeList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valorNormalizado, ...(desvincular ? { usuario_id: null } : {}) } : p))
    );
    await supabase
      .from('operador_peru_miembro')
      .update({ [campo]: valorNormalizado, ...(desvincular ? { usuario_id: null } : {}) })
      .eq('id', id);
  };

  const eliminarPe = async (id: string) => {
    await supabase.from('operador_peru_miembro').delete().eq('id', id);
    if (negocioId) cargarEquipos(negocioId);
  };

  const editarComisionPe = async (id: string, valor: string) => {
    const pct = Number(valor.replace(',', '.'));
    if (!Number.isFinite(pct)) return;
    setPeList((prev) => prev.map((p) => (p.id === id ? { ...p, comision_pct: pct } : p)));
    await supabase.from('operador_peru_miembro').update({ comision_pct: pct }).eq('id', id);
  };

  const agregarVe = async () => {
    if (!negocioId || !usuario) return;
    setErrorVe(null);
    const limites = obtenerLimitesEquipo(usuario.plan);
    if (veList.length >= limites.venezuela) {
      setErrorVe(`Alcanzaste el límite de ${limites.venezuela} operadores en Venezuela de tu plan ${usuario.plan.toUpperCase()}.`);
      return;
    }
    if (!veNombre.trim() || !veEmail.trim()) {
      setErrorVe('Completa el nombre y el correo.');
      return;
    }
    setGuardandoVe(true);
    const { error } = await supabase.from('operador_venezuela_perfil').insert({
      operador_peru_id: negocioId,
      nombre: veNombre.trim(),
      telefono: veTelefono.trim() || null,
      email: veEmail.trim().toLowerCase(),
    });
    setGuardandoVe(false);
    if (error) {
      setErrorVe(error.message);
      return;
    }
    setVeNombre('');
    setVeTelefono('');
    setVeEmail('');
    setAgregandoVe(false);
    cargarEquipos(negocioId);
  };

  const agregarPe = async () => {
    if (!negocioId || !usuario) return;
    setErrorPe(null);
    const limites = obtenerLimitesEquipo(usuario.plan);
    if (peList.length >= limites.peru) {
      setErrorPe(`Alcanzaste el límite de ${limites.peru} miembro(s) de equipo en Perú de tu plan ${usuario.plan.toUpperCase()}.`);
      return;
    }
    if (!peNombre.trim() || !peEmail.trim()) {
      setErrorPe('Completa el nombre y el correo.');
      return;
    }
    setGuardandoPe(true);
    const { error } = await supabase.from('operador_peru_miembro').insert({
      operador_peru_id: negocioId,
      nombre: peNombre.trim(),
      telefono: peTelefono.trim() || null,
      email: peEmail.trim().toLowerCase(),
    });
    setGuardandoPe(false);
    if (error) {
      setErrorPe(error.message);
      return;
    }
    setPeNombre('');
    setPeTelefono('');
    setPeEmail('');
    setAgregandoPe(false);
    cargarEquipos(negocioId);
  };

  // Mensaje de bienvenida por WhatsApp para un operador recién agregado
  // (VE o miembro de Perú): le confirma su rol y el correo Gmail exacto con
  // el que debe iniciar sesión, ya que la vinculación a su sesión es por
  // ese correo (ver handle_new_user / vincular_cuenta_pendiente).
  const enviarBienvenidaWhatsApp = (nombre: string, telefono: string | null, email: string | null, rolTexto: string) => {
    const mensaje = `Hola ${nombre}, ${usuario?.nombre ?? 'tu Operador principal de Perú'} te registró como ${rolTexto} en Remesas PERU-VENEZUELA. Ingresa a https://remesasia.vercel.app/ y elige "Iniciar sesión con Google" usando exactamente este correo: ${email ?? ''}`;
    const enlace = construirEnlaceWhatsAppGenerico(telefono, mensaje);
    if (!enlace) {
      const aviso = 'Agrega un teléfono válido para poder enviar el mensaje de bienvenida por WhatsApp.';
      if (Platform.OS === 'web') window.alert(aviso);
      else Alert.alert('Sin teléfono', aviso);
      return;
    }
    Linking.openURL(enlace);
  };

  // Asignar/desasignar un miembro de Perú a un Operador de Venezuela
  const alternarAsignacion = async (miembroIdAsig: string, activar: boolean) => {
    if (!asignandoVe) return;
    setPeList((prev) => prev.map((p) => (p.id === miembroIdAsig ? { ...p, operador_venezuela_id: activar ? asignandoVe.id : null } : p)));
    await supabase
      .from('operador_peru_miembro')
      .update({ operador_venezuela_id: activar ? asignandoVe.id : null })
      .eq('id', miembroIdAsig);
  };

  if (!usuario || !negocioId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {esPrincipal ? (
        <>
          <Text style={styles.rolTitulo}>OPERADOR PRINCIPAL DE PERÚ</Text>
          <Text style={styles.nombre}>{usuario.nombre}</Text>
          <Text style={styles.email}>{usuario.email}</Text>
          <Text style={styles.telefono}>{usuario.telefono ?? 'Sin teléfono'}</Text>
        </>
      ) : (
        <>
          <Text style={styles.rolTitulo}>OPERADOR DE PERÚ MIEMBRO</Text>

          {/* Datos del Operador principal de Perú: solo lectura, siempre primero */}
          {principal && (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.cardTitulo}>OPERADOR PRINCIPAL DE PERÚ</Text>
              <Text style={styles.miembroNombre}>{principal.nombre}</Text>
              <Text style={styles.miembroDato}>{principal.email}</Text>
              <Text style={styles.miembroDato}>{principal.telefono ?? 'Sin teléfono'}</Text>
            </View>
          )}

          {/* Operador de Venezuela asignado a este miembro: solo lectura. */}
          {miVe && (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.cardTitulo}>OPERADOR DE VENEZUELA ASIGNADO</Text>
              <Text style={styles.miembroNombre}>{miVe.nombre}</Text>
              <Text style={styles.miembroDato}>{miVe.email}</Text>
              <Text style={styles.miembroDato}>{miVe.telefono ?? 'Sin teléfono'}</Text>
              {(() => {
                const enlace = construirEnlaceWhatsAppGenerico(miVe.telefono, `Hola ${miVe.nombre}, te escribo por Remesas PERU-VENEZUELA.`);
                return (
                  enlace && (
                    <Pressable style={styles.whatsappBtn} onPress={() => Linking.openURL(enlace)}>
                      <Text style={styles.whatsappBtnTexto}>💬 Contactar por WhatsApp</Text>
                    </Pressable>
                  )
                );
              })()}
            </View>
          )}

          {/* % de comisión: lo asigna el Operador principal, acá solo se ve. */}
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.cardTitulo}>% Comisión asignada</Text>
            <Text style={styles.miembroNombre}>{miembroRow?.comision_pct ?? 0}%</Text>
          </View>
        </>
      )}

      {esPrincipal && usuario && (
        <View style={[styles.card, cardShadow, styles.planCardGrande]}>
          <Text style={styles.cardTitulo}>TU PLAN</Text>
          <Text style={styles.planNombreGrande}>{planLabel(usuario.plan)}</Text>
          <Text style={styles.cardTexto}>
            {usuario.plan === 'demo'
              ? `Quedan ${diasRestantesDemo(usuario.demo_inicio)} días${
                  usuario.demo_inicio ? ` — vence el ${FORMATTER_FECHA.format(fechaFinDemo(usuario.demo_inicio))}` : ''
                }.`
              : periodoVerificado
                ? `Quedan ${diasRestantesPeriodo(periodoVerificado)} días — vence el ${FORMATTER_FECHA.format(fechaVencimientoPeriodo(periodoVerificado))}.`
                : 'Esperando la verificación de tu primer pago.'}
          </Text>

          {pagoPeriodoActual?.estado === 'pendiente' && (
            <View style={styles.solicitudPendienteBox}>
              <Text style={styles.solicitudPendienteTexto}>
                Elegiste el plan {planLabel(planDesdeMonto(pagoPeriodoActual.monto))} (S/ {pagoPeriodoActual.monto.toFixed(2)}) —
                pendiente de verificación del administrador.
              </Text>
            </View>
          )}

          {siguientesPlanes(usuario.plan).length > 0 && (
            <View style={styles.metaBloque}>
              <Text style={styles.metaTitulo}>Próxima Meta</Text>
              {siguientesPlanes(usuario.plan).map((planSiguiente) => {
                const limites = obtenerLimitesPlan(planSiguiente);
                return (
                  <View key={planSiguiente} style={styles.metaFila}>
                    <View style={styles.metaFilaDatos}>
                      <Text style={styles.metaFilaNombre}>{planLabel(planSiguiente)}</Text>
                      <Text style={styles.metaFilaDato}>
                        {limites.clientes === Infinity ? 'Clientes a acordar' : `${limites.clientes} clientes`} ·{' '}
                        {limites.peru === Infinity ? 'operadores PE a acordar' : `${limites.peru} operador(es) Perú`} ·{' '}
                        {limites.venezuela === Infinity ? 'operadores VE a acordar' : `${limites.venezuela} en Venezuela`}
                      </Text>
                    </View>
                    <Pressable style={styles.metaSolicitarBtn} onPress={() => setSolicitandoPlan(planSiguiente)}>
                      <Text style={styles.metaSolicitarBtnTexto}>Solicitar →</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {solicitandoPlan && (
            <View style={styles.metaFormulario}>
              <View style={styles.metaFormularioHeader}>
                <Text style={styles.metaTitulo}>Solicitar {planLabel(solicitandoPlan)}</Text>
                <Pressable onPress={() => setSolicitandoPlan(null)}>
                  <Text style={styles.miembroEliminarTexto}>✕</Text>
                </Pressable>
              </View>
              <FormularioSolicitudPlan
                plan={solicitandoPlan}
                onEnviado={() => {
                  setSolicitandoPlan(null);
                  cargarContexto();
                }}
              />
            </View>
          )}
        </View>
      )}

      {esPrincipal && <PlanesInfo />}

      {esPrincipal && (
        <Collapsible
          abiertoPorDefecto
          titulo={`OPERADORES EN VENEZUELA - EQUIPO (${veList.length}/${obtenerLimitesEquipo(usuario.plan).venezuela})`}
          subtitulo="Asigna a cada Operador de Venezuela los operadores de Perú que deberá atender."
        >
          {veList.length === 0 && <Text style={styles.cardTexto}>Todavía no hay ninguno registrado.</Text>}
          {veList.map((v) => (
            <Collapsible
              key={v.id}
              titulo={v.nombre}
              subtitulo={v.email ?? 'Sin correo'}
              extra={
                <Pressable onPress={() => eliminarVe(v.id)} style={styles.miembroEliminarBtn}>
                  <Text style={styles.miembroEliminarTexto}>✕</Text>
                </Pressable>
              }
            >
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={v.nombre}
                onChangeText={(t) => editarVe(v.id, 'nombre', t)}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={v.telefono ?? ''}
                onChangeText={(t) => editarVe(v.id, 'telefono', t)}
                keyboardType="phone-pad"
                placeholder="Teléfono"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>Correo</Text>
              <TextInput
                style={styles.input}
                value={v.email ?? ''}
                onChangeText={(t) => editarVe(v.id, 'email', t)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>% Comisión</Text>
              <TextInput
                style={styles.input}
                value={String(v.comision_pct ?? 0)}
                onChangeText={(t) => editarComisionVe(v.id, t)}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textMuted}
              />
              {peList.filter((p) => p.operador_venezuela_id === v.id).length > 0 && (
                <View style={styles.asignadosBloque}>
                  <Text style={styles.asignadosLabel}>Operadores de Perú asignados:</Text>
                  {peList
                    .filter((p) => p.operador_venezuela_id === v.id)
                    .map((p) => (
                      <Text key={p.id} style={styles.asignadosItem}>
                        • {p.nombre}
                      </Text>
                    ))}
                </View>
              )}
              <View style={styles.filaBotonesFinales}>
                <Pressable style={styles.asignarBtn} onPress={() => setAsignandoVe(v)}>
                  <Text style={styles.asignarBtnTexto}>Asignar operadores de Perú →</Text>
                </Pressable>
                <Pressable
                  style={styles.whatsappBtn}
                  onPress={() => enviarBienvenidaWhatsApp(v.nombre, v.telefono, v.email, 'Operador de Venezuela')}
                >
                  <Text style={styles.whatsappBtnTexto}>📲 Enviar bienvenida</Text>
                </Pressable>
              </View>
            </Collapsible>
          ))}

          {veList.length >= obtenerLimitesEquipo(usuario.plan).venezuela ? (
            <Text style={styles.limiteTexto}>Alcanzaste el límite de {obtenerLimitesEquipo(usuario.plan).venezuela} operadores en Venezuela de tu plan.</Text>
          ) : (
            <NuevoOperadorForm
              abierto={agregandoVe}
              onAbrir={() => setAgregandoVe(true)}
              onCancelar={() => setAgregandoVe(false)}
              nombre={veNombre}
              onNombre={setVeNombre}
              telefono={veTelefono}
              onTelefono={setVeTelefono}
              telefonoPlaceholder="+58 999 999 999"
              email={veEmail}
              onEmail={setVeEmail}
              guardando={guardandoVe}
              error={errorVe}
              onGuardar={agregarVe}
            />
          )}
        </Collapsible>
      )}

      {esPrincipal && (
        <Collapsible
          abiertoPorDefecto
          titulo={`OPERADORES EN PERÚ - EQUIPO (${peList.length}/${obtenerLimitesEquipo(usuario.plan).peru})`}
        >
          {peList.length === 0 && <Text style={styles.cardTexto}>Todavía no hay ningún miembro agregado.</Text>}
          {peList.map((p) => {
            const veAsignado = veList.find((v) => v.id === p.operador_venezuela_id);
            return (
              <Collapsible
                key={p.id}
                titulo={p.nombre}
                subtitulo={`${p.email} · ${clientesPorMiembro[p.id] ?? 0} clientes`}
                extra={
                  <Pressable onPress={() => eliminarPe(p.id)} style={styles.miembroEliminarBtn}>
                    <Text style={styles.miembroEliminarTexto}>✕</Text>
                  </Pressable>
                }
              >
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={p.nombre}
                  onChangeText={(t) => editarPe(p.id, 'nombre', t)}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={p.telefono ?? ''}
                  onChangeText={(t) => editarPe(p.id, 'telefono', t)}
                  keyboardType="phone-pad"
                  placeholder="Teléfono"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.label}>Correo</Text>
                <TextInput
                  style={styles.input}
                  value={p.email ?? ''}
                  onChangeText={(t) => editarPe(p.id, 'email', t)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.label}>% Comisión</Text>
                <TextInput
                  style={styles.input}
                  value={String(p.comision_pct ?? 0)}
                  onChangeText={(t) => editarComisionPe(p.id, t)}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.asignadoVe}>{veAsignado ? `Asignado a: ${veAsignado.nombre}` : 'Sin Operador de Venezuela asignado'}</Text>
                <Pressable
                  style={styles.whatsappBtn}
                  onPress={() => enviarBienvenidaWhatsApp(p.nombre, p.telefono, p.email, 'Operador de Perú')}
                >
                  <Text style={styles.whatsappBtnTexto}>📲 Enviar bienvenida</Text>
                </Pressable>

                <Collapsible titulo={`Clientes (${clientesPorMiembro[p.id] ?? 0})`}>
                  <ClientesMiembroList
                    miembro={p}
                    clientes={clientesNegocio.filter((c) => c.invitado_por_operador_miembro_id === p.id)}
                    miembros={peList}
                    onDerivado={() => negocioId && cargarEquipos(negocioId)}
                  />
                </Collapsible>
              </Collapsible>
            );
          })}

          {peList.length >= obtenerLimitesEquipo(usuario.plan).peru ? (
            <Text style={styles.limiteTexto}>Alcanzaste el límite de {obtenerLimitesEquipo(usuario.plan).peru} miembro(s) de equipo en Perú de tu plan.</Text>
          ) : (
            <NuevoOperadorForm
              abierto={agregandoPe}
              onAbrir={() => setAgregandoPe(true)}
              onCancelar={() => setAgregandoPe(false)}
              nombre={peNombre}
              onNombre={setPeNombre}
              telefono={peTelefono}
              onTelefono={setPeTelefono}
              telefonoPlaceholder="+51 999 999 999"
              email={peEmail}
              onEmail={setPeEmail}
              guardando={guardandoPe}
              error={errorPe}
              onGuardar={agregarPe}
            />
          )}
        </Collapsible>
      )}

      {esPrincipal && (
        <Pressable style={styles.buttonOutline} onPress={() => router.push('/(operador-peru)/onboarding')}>
          <Text style={styles.buttonOutlineText}>Editar datos del negocio</Text>
        </Pressable>
      )}

      {/* Modal de asignación: elige qué operadores de Perú atiende cada VE */}
      <Modal visible={!!asignandoVe} transparent animationType="fade" onRequestClose={() => setAsignandoVe(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Asignar operadores de Perú</Text>
            <Text style={styles.modalTexto}>
              {asignandoVe ? `Marca los operadores de Perú que atenderá ${asignandoVe.nombre} en Venezuela.` : ''}
            </Text>
            {peList.length === 0 ? (
              <Text style={styles.cardTexto}>Primero agrega operadores de Perú a tu equipo.</Text>
            ) : (
              peList.map((p) => {
                const asignado = p.operador_venezuela_id === asignandoVe?.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.miembroOpcion, asignado && styles.miembroOpcionActivo]}
                    onPress={() => alternarAsignacion(p.id, !asignado)}
                  >
                    <View style={styles.miembroOpcionDatos}>
                      <Text style={styles.miembroOpcionNombre}>{p.nombre}</Text>
                      <Text style={styles.miembroOpcionDato}>
                        {clientesPorMiembro[p.id] ?? 0} clientes
                        {p.operador_venezuela_id && p.operador_venezuela_id !== asignandoVe?.id ? ' · asignado a otro VE' : ''}
                      </Text>
                    </View>
                    <Text style={[styles.miembroOpcionCheck, asignado && styles.miembroOpcionCheckActivo]}>{asignado ? '✓' : '○'}</Text>
                  </Pressable>
                );
              })
            )}
            <Pressable style={styles.modalCerrar} onPress={() => setAsignandoVe(null)}>
              <Text style={styles.modalCerrarTexto}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function NuevoOperadorForm({
  abierto,
  onAbrir,
  onCancelar,
  nombre,
  onNombre,
  telefono,
  onTelefono,
  telefonoPlaceholder,
  email,
  onEmail,
  guardando,
  error,
  onGuardar,
}: {
  abierto: boolean;
  onAbrir: () => void;
  onCancelar: () => void;
  nombre: string;
  onNombre: (v: string) => void;
  telefono: string;
  onTelefono: (v: string) => void;
  telefonoPlaceholder: string;
  email: string;
  onEmail: (v: string) => void;
  guardando: boolean;
  error: string | null;
  onGuardar: () => void;
}) {
  if (!abierto) {
    return (
      <Pressable style={styles.agregarBtn} onPress={onAbrir}>
        <Text style={styles.agregarBtnTexto}>+ Agregar operador</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.nuevoBloque}>
      <Text style={styles.label}>Nombre completo</Text>
      <TextInput style={styles.input} value={nombre} onChangeText={onNombre} placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Teléfono (para el mensaje de bienvenida por WhatsApp)</Text>
      <TextInput
        style={styles.input}
        value={telefono}
        onChangeText={onTelefono}
        keyboardType="phone-pad"
        placeholder={telefonoPlaceholder}
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Correo Gmail (con ese correo debe iniciar sesión)</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={onEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="nombre@gmail.com"
        placeholderTextColor={colors.textMuted}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.nuevoAccionesRow}>
        <Pressable style={styles.guardarNuevoBtn} onPress={onGuardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.guardarNuevoBtnTexto}>Guardar</Text>}
        </Pressable>
        <Pressable style={styles.cancelarNuevoBtn} onPress={onCancelar} disabled={guardando}>
          <Text style={styles.cancelarNuevoBtnTexto}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  rolTitulo: { color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  nombre: { color: colors.text, fontSize: 25, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 16, marginTop: -8 },
  telefono: { color: colors.textMuted, fontSize: 16, marginBottom: 4 },
  planCardGrande: { gap: 10 },
  planNombreGrande: { color: colors.text, fontSize: 32, fontWeight: '900' },
  solicitudPendienteBox: {
    backgroundColor: `${colors.warning}22`,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.sm,
    padding: 10,
  },
  solicitudPendienteTexto: { color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  metaBloque: { marginTop: 8, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  metaTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  metaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
  },
  metaFilaDatos: { flex: 1, gap: 2 },
  metaFilaNombre: { color: colors.text, fontSize: 16, fontWeight: '800' },
  metaFilaDato: { color: colors.textMuted, fontSize: 14 },
  metaSolicitarBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  metaSolicitarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  metaFormulario: { marginTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  metaFormularioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  cardTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 18 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  botonTexto: { color: colors.text, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 17,
    marginTop: 5,
    backgroundColor: colors.cardAlt,
  },
  error: { color: colors.danger, fontSize: 15, marginTop: 6 },
  guardarBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 12 },
  guardarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 16 },
  miembroFila: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4, gap: 2 },
  miembroHeaderRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  miembroInputNombre: { flex: 1, minWidth: 0, marginTop: 0 },
  miembroEliminarBtn: { padding: 8 },
  miembroEliminarTexto: { color: colors.danger, fontWeight: '800', fontSize: 16 },
  miembroNombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  miembroDato: { color: colors.textMuted, fontSize: 14 },
  asignadosBloque: { marginTop: 6, gap: 2 },
  asignadosLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  asignadosItem: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  asignarBtn: { alignSelf: 'flex-start', marginTop: 8 },
  asignarBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  filaBotonesFinales: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' },
  whatsappBtn: { alignSelf: 'flex-start', marginTop: 8 },
  whatsappBtnTexto: { color: colors.success, fontWeight: '700', fontSize: 15 },
  asignadoVe: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic', marginTop: 2 },
  agregarBtn: { marginTop: 10, alignSelf: 'flex-start' },
  agregarBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  limiteTexto: { color: colors.warning, fontSize: 14, fontWeight: '600', marginTop: 10 },
  nuevoBloque: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  nuevoAccionesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  guardarNuevoBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  guardarNuevoBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
  cancelarNuevoBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  cancelarNuevoBtnTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
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
  miembroOpcionCheck: { color: colors.textMuted, fontSize: 21, fontWeight: '900' },
  miembroOpcionCheckActivo: { color: colors.success },
  modalCerrar: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 12 },
  modalCerrarTexto: { color: colors.textMuted, fontWeight: '700' },
});
