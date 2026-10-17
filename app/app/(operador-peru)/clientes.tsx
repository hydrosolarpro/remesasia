import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert, Linking, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { generarYCompartirPdf } from '../../lib/pdfReporte';
import { generarYCompartirExcel } from '../../lib/excelReporte';
import { obtenerOCrearInvitacionCliente, construirEnlaceLandingCliente } from '../../lib/invitaciones';
import { construirEnlaceWhatsAppSinDestino } from '../../lib/whatsapp';
import { resolverContextoOperador } from '../../lib/sesionOperador';
import { useCorredor } from '../../lib/corredor';
import { hoyLima } from '../../lib/tasaEspecial';
import { obtenerLimiteClientes } from '../../lib/plan';
import { DOCUMENTO_TIPO_ETIQUETA, documentoClienteCompleto } from '../../lib/perfilCliente';
import { ZoomableImageModal } from '../../components/ZoomableImageModal';
import { GestionPinUsuario } from '../../components/GestionPinUsuario';
import { ProvisionarClientePin } from '../../components/ProvisionarClientePin';
import { CupoClientesCard } from '../../components/CupoClientesAviso';
import { Collapsible } from '../../components/Collapsible';
import { Usuario, OperadorPeruMiembro } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

const MENSAJE_INVITACION_CLIENTE =
  'Hola!!!, te comparto información importante sobre una plataforma para facilitar tu remesa a Venezuela. Desde esta pagina web podrás acceder de forma segura a una plataforma donde podrás realizar tus envíos, info de Tasa del día, horario de atención, calculadora de conversión SOLES A BS, Tasas del BCV (USD y EURO) con sus conversiones de tus envíos, notificaciones del estado de tus depósitos y envíos por Telegram-ChatBot, registrar los datos personales y bancarios para el envío de remesas a tus familiares y amigos.';

export default function ClientesRegistrados() {
  const { usuario } = useAuth();
  const { corredor } = useCorredor();
  const [negocioId, setNegocioId] = useState<string | null | undefined>(undefined);
  const [miembroId, setMiembroId] = useState<string | null>(null);
  const [esPrincipal, setEsPrincipal] = useState(true);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [clientesBaja, setClientesBaja] = useState<Usuario[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [enlaceCliente, setEnlaceCliente] = useState<string | null>(null);
  const [cargandoEnlace, setCargandoEnlace] = useState(true);
  const [errorEnlace, setErrorEnlace] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [planNegocio, setPlanNegocio] = useState('demo');
  const [limiteClientesUnlimited, setLimiteClientesUnlimited] = useState<number | null>(null);
  const [miembros, setMiembros] = useState<OperadorPeruMiembro[]>([]);
  const [derivandoCliente, setDerivandoCliente] = useState<Usuario | null>(null);
  const [derivandoMiembroId, setDerivandoMiembroId] = useState<string | null>(null);
  const [derivandoEnviando, setDerivandoEnviando] = useState(false);
  const [zoomDocumentoUrl, setZoomDocumentoUrl] = useState<string | null>(null);
  // Tasa especial del día por cliente (solo el principal): vigente hoy y borrador del input.
  const [tasasEspeciales, setTasasEspeciales] = useState<Record<string, number>>({});
  const [tasaInputs, setTasaInputs] = useState<Record<string, string>>({});
  const [guardandoTasaId, setGuardandoTasaId] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    resolverContextoOperador(usuario).then(async (ctx) => {
      if (!ctx.negocioId) return;
      setNegocioId(ctx.negocioId);
      setMiembroId(ctx.miembroId);
      setEsPrincipal(ctx.tipo === 'principal');
      // El cupo de clientes es del negocio (dueño), no de la sesión actual
      // -- un miembro de equipo no tiene su propio "plan".
      const { data: principalData } = await supabase.from('usuarios').select('plan, limite_clientes_unlimited').eq('id', ctx.negocioId).maybeSingle();
      if (principalData?.plan) setPlanNegocio(principalData.plan);
      setLimiteClientesUnlimited(principalData?.limite_clientes_unlimited ?? null);
    });
  }, [usuario]);

  // Filtros comunes a "activos" y "dados de baja": mismo negocio y, según
  // la sesión, solo los clientes propios del principal o los de un miembro
  // en particular (ver comentarios de cada rama más abajo).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conFiltrosDeSesion = useCallback(
    (q: any) => {
      let query = q.eq('rol', 'cliente').eq('negocio_operador_peru_id', negocioId!);
      if (esPrincipal) {
        // Los clientes de un miembro de Perú ya no se listan acá -- viven en
        // Perfil, dentro de la tarjeta de ese operador (ver
        // ClientesMiembroList). Esta pantalla solo muestra los clientes que
        // el principal invitó directamente.
        query = query.is('invitado_por_operador_miembro_id', null);
      } else if (miembroId) {
        // Un miembro de Perú solo ve los clientes que él mismo invitó.
        query = query.eq('invitado_por_operador_miembro_id', miembroId);
      }
      return query;
    },
    [negocioId, esPrincipal, miembroId]
  );

  const cargarClientes = useCallback(() => {
    if (!negocioId) return;
    setCargandoClientes(true);
    Promise.all([
      conFiltrosDeSesion(supabase.from('usuarios').select('*'))
        .is('eliminado_at', null)
        .order('created_at', { ascending: false }),
      // Clientes que se dieron de baja (ellos mismos desde su Perfil, o que
      // el operador eliminó) -- ver supabase/functions/eliminar-cliente.
      // Se muestran para que el operador conserve sus datos a la vista,
      // ordenados del más reciente al más antiguo.
      conFiltrosDeSesion(supabase.from('usuarios').select('*'))
        .not('eliminado_at', 'is', null)
        .order('eliminado_at', { ascending: false }),
    ]).then(([{ data: activos }, { data: bajas }]) => {
      setClientes((activos as Usuario[] | null) ?? []);
      setClientesBaja((bajas as Usuario[] | null) ?? []);
      setCargandoClientes(false);
    });
  }, [negocioId, conFiltrosDeSesion]);

  const cargarTasasEspeciales = useCallback(async () => {
    if (!negocioId) return;
    const { data } = await supabase
      .from('tasas_cliente')
      .select('cliente_id, tasa_pen_ves')
      .eq('negocio_operador_peru_id', negocioId)
      .eq('corredor', corredor.id)
      .eq('fecha', hoyLima());
    const mapa: Record<string, number> = {};
    (data ?? []).forEach((t) => {
      mapa[t.cliente_id as string] = Number(t.tasa_pen_ves);
    });
    setTasasEspeciales(mapa);
    setTasaInputs({});
  }, [negocioId, corredor.id]);

  useEffect(() => {
    cargarTasasEspeciales();
  }, [cargarTasasEspeciales]);

  const avisar = (titulo: string, mensaje: string) => {
    if (Platform.OS === 'web') window.alert(`${titulo}: ${mensaje}`);
    else Alert.alert(titulo, mensaje);
  };

  const guardarTasaEspecial = async (clienteId: string) => {
    if (!negocioId) return;
    const valor = Number((tasaInputs[clienteId] ?? '').replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
      avisar('Tasa inválida', 'Ingresa una tasa mayor a 0.');
      return;
    }
    setGuardandoTasaId(clienteId);
    const { error } = await supabase.from('tasas_cliente').upsert(
      {
        negocio_operador_peru_id: negocioId,
        cliente_id: clienteId,
        corredor: corredor.id,
        fecha: hoyLima(),
        tasa_pen_ves: valor,
        publicada_por: usuario?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cliente_id,corredor,fecha' }
    );
    setGuardandoTasaId(null);
    if (error) {
      avisar('No se pudo guardar', error.message);
      return;
    }
    cargarTasasEspeciales();
  };

  const quitarTasaEspecial = async (clienteId: string) => {
    setGuardandoTasaId(clienteId);
    const { error } = await supabase
      .from('tasas_cliente')
      .delete()
      .eq('cliente_id', clienteId)
      .eq('corredor', corredor.id)
      .eq('fecha', hoyLima());
    setGuardandoTasaId(null);
    if (error) {
      avisar('No se pudo quitar', error.message);
      return;
    }
    cargarTasasEspeciales();
  };

  // Solo el principal puede derivar clientes a un miembro de su equipo.
  useEffect(() => {
    if (!negocioId || !esPrincipal) return;
    supabase
      .from('operador_peru_miembro')
      .select('*')
      .eq('operador_peru_id', negocioId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMiembros((data as OperadorPeruMiembro[] | null) ?? []));
  }, [negocioId, esPrincipal]);

  const abrirDerivacion = (cliente: Usuario) => {
    setDerivandoCliente(cliente);
    setDerivandoMiembroId(cliente.invitado_por_operador_miembro_id ?? null);
  };

  const confirmarDerivacion = async () => {
    if (!derivandoCliente || !derivandoMiembroId) return;
    setDerivandoEnviando(true);
    const { error } = await supabase.rpc('derivar_cliente', {
      p_cliente_id: derivandoCliente.id,
      p_operador_peru_miembro_id: derivandoMiembroId,
    });
    setDerivandoEnviando(false);
    setDerivandoCliente(null);
    setDerivandoMiembroId(null);
    if (error) {
      Alert.alert('No se pudo derivar', error.message);
      return;
    }
    cargarClientes();
  };

  useFocusEffect(
    useCallback(() => {
      cargarClientes();
    }, [cargarClientes])
  );

  // Borrado lógico: marca al cliente como eliminado y borra su acceso (ver
  // supabase/functions/eliminar-cliente). Su fila de `usuarios` no se
  // borra físicamente -- así sus solicitudes pasadas conservan su nombre
  // y datos completos en reportes/exportes, sin importar cuánto historial
  // tenga.
  const eliminarCliente = (item: Usuario) => {
    const confirmarYBorrar = async () => {
      setEliminandoId(item.id);
      // Ver el mismo refresco defensivo en (admin)/panel-control.tsx: evita
      // un falso "No autenticado" cuando el panel quedó abierto mucho rato
      // y el token de acceso venció antes del clic.
      await supabase.auth.refreshSession().catch(() => {});
      const { data, error } = await supabase.functions.invoke('eliminar-cliente', { body: { cliente_id: item.id } });
      setEliminandoId(null);
      // supabase.functions.invoke() NO pone el cuerpo JSON del error en
      // `data` cuando la función responde con status distinto de 2xx --
      // ahí `data` es null y solo queda `error.message` genérico
      // ("Edge Function returned a non-2xx status code"). El mensaje real
      // que arma la función (p.ej. "tiene solicitudes registradas") viaja
      // en `error.context`, la Response cruda del fetch.
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
        if (Platform.OS === 'web') window.alert(mensajeError);
        else Alert.alert('No se pudo eliminar', mensajeError);
        return;
      }
      cargarClientes();
    };

    const mensaje = `¿Eliminar a ${item.nombre} de tus clientes? Perderá el acceso a la app; sus solicitudes anteriores se conservan en tus reportes. Esta acción no se puede deshacer.`;
    if (Platform.OS === 'web') {
      if (window.confirm(mensaje)) confirmarYBorrar();
      return;
    }
    Alert.alert('Eliminar cliente', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: confirmarYBorrar },
    ]);
  };

  useEffect(() => {
    if (!negocioId) return;
    setCargandoEnlace(true);
    setErrorEnlace(null);
    obtenerOCrearInvitacionCliente(negocioId, miembroId)
      .then((inv) => setEnlaceCliente(construirEnlaceLandingCliente(inv.token)))
      .catch((err) => setErrorEnlace(err instanceof Error ? err.message : 'No se pudo generar tu enlace de invitación.'))
      .finally(() => setCargandoEnlace(false));
  }, [negocioId, miembroId]);

  // Un solo botón: comparte la landing page (información del servicio) por
  // WhatsApp con un mensaje fijo -- sin mostrar la URL cruda en pantalla ni
  // botones separados para "ver landing" / "copiar enlace". Sin número de
  // destino fijo: WhatsApp abre su propio selector de contactos para que
  // el operador elija a quién reenviarlo, sin depender de tener su
  // teléfono cargado en el perfil.
  const compartirInvitacionWhatsApp = () => {
    if (!enlaceCliente) return;
    const mensaje = `${MENSAJE_INVITACION_CLIENTE} ${enlaceCliente}`;
    Linking.openURL(construirEnlaceWhatsAppSinDestino(mensaje));
  };

  // El buscador solo filtra lo que se ve en pantalla (nombre o teléfono);
  // la descarga en Excel siempre lleva a TODOS los clientes, sin importar
  // si hay algo escrito en el buscador.
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').toLowerCase().includes(q));
  }, [clientes, busqueda]);

  const exportarExcelClientes = async () => {
    setExportandoExcel(true);
    try {
      const filas = clientes.map((c) => ({
        Nombre: c.nombre,
        Correo: c.email ?? '',
        Teléfono: c.telefono ?? '',
        País: c.pais ?? '',
        'Tipo de documento': c.documento_tipo ? DOCUMENTO_TIPO_ETIQUETA[c.documento_tipo] : '',
        'N° de documento': c.documento_numero ?? '',
        'Recomendado por (nombre)': [c.referido_nombre, c.referido_apellido].filter(Boolean).join(' '),
        'Recomendado por (teléfono)': c.referido_telefono ?? '',
        'Fecha de registro': new Date(c.created_at).toLocaleString('es-PE'),
      }));
      await generarYCompartirExcel('clientes-registrados', 'Clientes', filas);
    } finally {
      setExportandoExcel(false);
    }
  };

  const exportarPdfClientes = async () => {
    setGenerandoPdf(true);
    try {
      const filas = clientes
        .map(
          (c) => {
            const referido = [c.referido_nombre, c.referido_apellido].filter(Boolean).join(' ');
            return `<tr>
            <td>${c.nombre}</td>
            <td>${c.email ?? '—'}</td>
            <td>${c.telefono ?? '—'}</td>
            <td>${c.pais ?? '—'}</td>
            <td>${c.documento_tipo ? `${DOCUMENTO_TIPO_ETIQUETA[c.documento_tipo]} ${c.documento_numero}` : '—'}</td>
            <td>${referido || '—'}${c.referido_telefono ? ` · ${c.referido_telefono}` : ''}</td>
            <td>${new Date(c.created_at).toLocaleDateString('es-PE')}</td>
          </tr>`;
          }
        )
        .join('');

      await generarYCompartirPdf(
        'Clientes registrados',
        `${clientes.length} clientes`,
        `<table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>País</th><th>Documento</th><th>Recomendado por</th><th>Registrado</th></tr></thead>
          <tbody>${filas || '<tr><td colspan="7">Sin clientes registrados.</td></tr>'}</tbody>
        </table>`
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>Invitación a tus clientes</Text>
        <Text style={styles.cardTexto}>Comparte la landing page con tu cliente por WhatsApp.</Text>
        {cargandoEnlace ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : errorEnlace ? (
          <Text style={styles.errorEnlace}>{errorEnlace}</Text>
        ) : (
          <Pressable style={styles.botonWhatsApp} onPress={compartirInvitacionWhatsApp}>
            <Text style={styles.botonWhatsAppTexto}>💬 Compartir por WhatsApp</Text>
          </Pressable>
        )}
      </View>

      <ProvisionarClientePin miembroId={miembroId} onCreado={cargarClientes} />


      <CupoClientesCard
        usados={clientes.length}
        limite={obtenerLimiteClientes(planNegocio, limiteClientesUnlimited)}
        plan={planNegocio}
        mostrarSolicitar={esPrincipal}
      />

      <View style={styles.header}>
        <Text style={styles.titulo}>Clientes registrados ({clientes.length})</Text>
        <View style={styles.headerBotones}>
          <Pressable style={styles.excelBtn} onPress={exportarExcelClientes} disabled={exportandoExcel || clientes.length === 0}>
            {exportandoExcel ? <ActivityIndicator color="#fff" /> : <Text style={styles.excelBtnTexto}>Excel</Text>}
          </Pressable>
          <Pressable style={styles.pdfBtn} onPress={exportarPdfClientes} disabled={generandoPdf || clientes.length === 0}>
            {generandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>PDF</Text>}
          </Pressable>
        </View>
      </View>
      <TextInput
        style={styles.buscador}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por nombre o teléfono..."
        placeholderTextColor={colors.textMuted}
      />
      {cargandoClientes ? (
        <ActivityIndicator color={colors.primary} />
      ) : clientes.length === 0 ? (
        <Text style={styles.vacio}>Todavía no tienes clientes registrados.</Text>
      ) : clientesFiltrados.length === 0 ? (
        <Text style={styles.vacio}>Sin resultados.</Text>
      ) : (
        <View style={styles.lista}>
          {clientesFiltrados.map((item) => {
            const atiende = miembros.find((m) => m.id === item.invitado_por_operador_miembro_id);
            return (
              <View key={item.id} style={[styles.card, cardShadow]}>
                <View style={styles.clienteHeader}>
                  <View style={styles.clienteDatos}>
                    <Text style={styles.nombre}>{item.nombre}</Text>
                    <Text style={styles.dato}>{item.email}</Text>
                    <Text style={styles.dato}>
                      {item.telefono ?? 'Sin teléfono'} · {item.pais ?? 'Sin país'}
                    </Text>
                    {documentoClienteCompleto(item) ? (
                      <Pressable onPress={() => setZoomDocumentoUrl(item.documento_imagen_url)}>
                        <Text style={styles.documentoDato}>
                          {DOCUMENTO_TIPO_ETIQUETA[item.documento_tipo!]} {item.documento_numero} · 🔍 Ver foto
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.documentoFalta}>⚠ Documento de identidad pendiente</Text>
                    )}
                    {(item.referido_nombre || item.referido_telefono) && (
                      <Text style={styles.dato}>
                        Recomendado por: {[item.referido_nombre, item.referido_apellido].filter(Boolean).join(' ')}
                        {item.referido_telefono ? ` · ${item.referido_telefono}` : ''}
                      </Text>
                    )}
                    {esPrincipal && <Text style={styles.dato}>Atendido por: {atiende ? atiende.nombre : 'Tú (principal)'}</Text>}
                  </View>
                  <Pressable
                    style={styles.eliminarBtn}
                    onPress={() => eliminarCliente(item)}
                    disabled={eliminandoId === item.id}
                  >
                    {eliminandoId === item.id ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Text style={styles.eliminarBtnTexto}>Eliminar</Text>
                    )}
                  </Pressable>
                </View>
                {esPrincipal && miembros.length > 0 && (
                  <Pressable style={styles.derivarBtn} onPress={() => abrirDerivacion(item)}>
                    <Text style={styles.derivarBtnTexto}>Derivar a un operador de Perú →</Text>
                  </Pressable>
                )}
                {!!negocioId && (
                  <View style={styles.tasaEspecialBox}>
                    <Text style={styles.tasaEspecialTitulo}>
                      Tasa especial del día{tasasEspeciales[item.id] ? `: VES ${tasasEspeciales[item.id]}` : ' (usa la tasa general)'}
                    </Text>
                    <View style={styles.tasaEspecialFila}>
                      <TextInput
                        style={styles.tasaEspecialInput}
                        value={tasaInputs[item.id] ?? ''}
                        onChangeText={(t) => setTasaInputs((prev) => ({ ...prev, [item.id]: t }))}
                        placeholder="Ej: 275"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                      <Pressable
                        style={[styles.tasaEspecialGuardar, guardandoTasaId === item.id && { opacity: 0.5 }]}
                        disabled={guardandoTasaId === item.id}
                        onPress={() => guardarTasaEspecial(item.id)}
                      >
                        <Text style={styles.tasaEspecialGuardarTexto}>Guardar</Text>
                      </Pressable>
                      {!!tasasEspeciales[item.id] && (
                        <Pressable disabled={guardandoTasaId === item.id} onPress={() => quitarTasaEspecial(item.id)}>
                          <Text style={styles.tasaEspecialQuitar}>Quitar</Text>
                        </Pressable>
                      )}
                    </View>
                    <Text style={styles.dato}>Vale solo hoy; mañana vuelve a la tasa general.</Text>
                  </View>
                )}
                <GestionPinUsuario
                  usuarioId={item.id}
                  provision={{ tipo: 'cliente', refId: miembroId }}
                  telefonoSugerido={item.telefono}
                  nombre={item.nombre}
                  colapsable
                />
              </View>
            );
          })}
        </View>
      )}

      {clientesBaja.length > 0 && (
        <Collapsible
          titulo={`⚠ Clientes dados de baja (${clientesBaja.length})`}
          subtitulo="Se dieron de baja ellos mismos, o fueron eliminados. Sus datos quedan aquí para que los tengas a la mano."
          abiertoPorDefecto
        >
          {clientesBaja.map((item) => {
            const atiende = miembros.find((m) => m.id === item.invitado_por_operador_miembro_id);
            // "Reciente" = últimas 72h -- el aviso que pediste: que se note
            // a simple vista cuando un cliente se dio de baja hace poco, no
            // solo que quede archivado en la lista.
            const esReciente = item.eliminado_at ? Date.now() - new Date(item.eliminado_at).getTime() < 72 * 60 * 60 * 1000 : false;
            return (
              <View key={item.id} style={[styles.cardBaja, esReciente && styles.cardBajaReciente]}>
                {esReciente && <Text style={styles.bajaRecienteTag}>Reciente</Text>}
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.dato}>
                  {item.telefono ?? 'Sin teléfono'} · {item.pais ?? 'Sin país'}
                </Text>
                {documentoClienteCompleto(item) ? (
                  <Pressable onPress={() => setZoomDocumentoUrl(item.documento_imagen_url)}>
                    <Text style={styles.documentoDato}>
                      {DOCUMENTO_TIPO_ETIQUETA[item.documento_tipo!]} {item.documento_numero} · 🔍 Ver foto
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.documentoFalta}>⚠ Documento de identidad pendiente</Text>
                )}
                {(item.referido_nombre || item.referido_telefono) && (
                  <Text style={styles.dato}>
                    Recomendado por: {[item.referido_nombre, item.referido_apellido].filter(Boolean).join(' ')}
                    {item.referido_telefono ? ` · ${item.referido_telefono}` : ''}
                  </Text>
                )}
                {esPrincipal && <Text style={styles.dato}>Atendía: {atiende ? atiende.nombre : 'Tú (principal)'}</Text>}
                <Text style={styles.dato}>Registrado: {new Date(item.created_at).toLocaleString('es-PE')}</Text>
                <Text style={styles.bajaFecha}>
                  Dado de baja: {item.eliminado_at ? new Date(item.eliminado_at).toLocaleString('es-PE') : '—'}
                </Text>
              </View>
            );
          })}
        </Collapsible>
      )}

      {/* Modal de derivación: solo lo usa el Operador principal. */}
      <Modal visible={!!derivandoCliente} transparent animationType="fade" onRequestClose={() => setDerivandoCliente(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Derivar cliente</Text>
            <Text style={styles.modalTexto}>
              {derivandoCliente ? `¿A qué operador de Perú quieres derivar a ${derivandoCliente.nombre}?` : ''}
            </Text>
            {miembros.map((m) => {
              const seleccionado = derivandoMiembroId === m.id;
              return (
                <Pressable key={m.id} style={[styles.miembroOpcion, seleccionado && styles.miembroOpcionActivo]} onPress={() => setDerivandoMiembroId(m.id)}>
                  <Text style={[styles.miembroOpcionNombre, seleccionado && { color: colors.text }]}>{m.nombre}</Text>
                  <Text style={styles.miembroOpcionDato} numberOfLines={1}>{m.email}</Text>
                  {seleccionado && <Text style={styles.miembroOpcionCheck}>✓</Text>}
                </Pressable>
              );
            })}
            <View style={styles.modalAcciones}>
              <Pressable style={styles.modalCancelar} onPress={() => setDerivandoCliente(null)}>
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

      <ZoomableImageModal visible={!!zoomDocumentoUrl} uri={zoomDocumentoUrl} onClose={() => setZoomDocumentoUrl(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, gap: 12, flexGrow: 1, paddingBottom: 48 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 17, fontWeight: '800' },
  cardTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 18 },
  botonWhatsApp: { backgroundColor: colors.success, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 6 },
  botonWhatsAppTexto: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  errorEnlace: { color: colors.danger, fontSize: 14, marginTop: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  headerBotones: { flexDirection: 'row', gap: 8 },
  titulo: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
  pdfBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  pdfBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  excelBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8 },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  buscador: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.cardAlt,
  },
  nombre: { color: colors.text, fontSize: 17, fontWeight: '700' },
  dato: { color: colors.textMuted, fontSize: 14 },
  documentoDato: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  documentoFalta: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  cardBaja: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 2,
  },
  cardBajaReciente: { borderColor: colors.danger },
  bajaRecienteTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.danger,
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  bajaFecha: { color: colors.danger, fontSize: 13, fontWeight: '700', marginTop: 4 },
  vacio: { color: colors.textMuted, fontSize: 15, fontStyle: 'italic' },
  lista: { gap: 10 },
  clienteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  clienteDatos: { flex: 1, gap: 2 },
  eliminarBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  eliminarBtnTexto: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  tasaEspecialBox: { gap: 6, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  tasaEspecialTitulo: { color: colors.text, fontSize: 15, fontWeight: '800' },
  tasaEspecialFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tasaEspecialInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 10, color: colors.text, fontSize: 16, backgroundColor: colors.cardAlt },
  tasaEspecialGuardar: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 11 },
  tasaEspecialGuardarTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  tasaEspecialQuitar: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  derivarBtn: { alignSelf: 'flex-start', marginTop: 8 },
  derivarBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
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
  miembroOpcionNombre: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  miembroOpcionDato: { color: colors.textMuted, fontSize: 13 },
  miembroOpcionCheck: { color: colors.success, fontWeight: '900' },
  modalAcciones: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  modalCancelarTexto: { color: colors.textMuted, fontWeight: '700' },
  modalConfirmar: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  modalConfirmarDeshabilitado: { opacity: 0.4 },
  modalConfirmarTexto: { color: colors.text, fontWeight: '700' },
});
