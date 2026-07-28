import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { obtenerOCrearInvitacionCliente, construirEnlaceInvitacion, construirEnlaceEntrada } from '../../lib/invitaciones';
import { construirEnlaceWhatsAppGenerico } from '../../lib/whatsapp';
import { diasRestantesDemo, fechaFinDemo, PRECIO_STARTER_MENSUAL, LIMITE_EQUIPO_VENEZUELA, LIMITE_EQUIPO_PERU } from '../../lib/plan';
import { FormularioSolicitudPlan } from '../../components/FormularioSolicitudPlan';
import { PlanesInfo } from '../../components/PlanesInfo';
import { OperadorVenezuelaPerfil, OperadorPeruMiembro } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

const FORMATTER_FECHA = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

function mensajeBienvenida(nombre: string): string {
  return `¡Hola ${nombre}! Bienvenido(a) al equipo de Remesas PERU-VENEZUELA 🎉. Ya puedes ingresar a la app desde este enlace: ${construirEnlaceEntrada()} — inicia sesión con este mismo correo de Gmail.`;
}

export default function Perfil() {
  const { usuario } = useAuth();
  const esDueno = usuario?.rol === 'operador_peru';
  const [negocioId, setNegocioId] = useState<string | null | undefined>(undefined);
  const [esMismoOperadorVe, setEsMismoOperadorVe] = useState(false);
  const [enlaceCliente, setEnlaceCliente] = useState<string | null>(null);
  const [generando, setGenerando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [veList, setVeList] = useState<OperadorVenezuelaPerfil[]>([]);
  const [peList, setPeList] = useState<OperadorPeruMiembro[]>([]);
  const [enviados, setEnviados] = useState<Record<string, boolean>>({});

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

  const [solicitandoStarter, setSolicitandoStarter] = useState(false);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === 'operador_peru') {
      setNegocioId(usuario.id);
      return;
    }
    supabase
      .from('operador_peru_miembro')
      .select('operador_peru_id')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => setNegocioId(data?.operador_peru_id ?? null));
  }, [usuario]);

  // El enlace es único por negocio y reutilizable: se busca (o se crea la
  // primera vez) apenas entra a esta pantalla, sin necesidad de un botón.
  useEffect(() => {
    if (!negocioId) return;
    obtenerOCrearInvitacionCliente(negocioId)
      .then((inv) => setEnlaceCliente(construirEnlaceInvitacion(inv.token)))
      .finally(() => setGenerando(false));
  }, [negocioId]);

  const cargarEquipos = useCallback(() => {
    if (!negocioId) return;
    supabase
      .from('operador_venezuela_perfil')
      .select('*')
      .eq('operador_peru_id', negocioId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setVeList((data as OperadorVenezuelaPerfil[] | null) ?? []));
    supabase
      .from('operador_peru_miembro')
      .select('*')
      .eq('operador_peru_id', negocioId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setPeList((data as OperadorPeruMiembro[] | null) ?? []));
  }, [negocioId]);

  useEffect(() => {
    cargarEquipos();
  }, [cargarEquipos]);

  useEffect(() => {
    if (!negocioId) return;
    supabase
      .from('perfil_negocio')
      .select('es_operador_venezuela_mismo')
      .eq('operador_peru_id', negocioId)
      .maybeSingle()
      .then(({ data }) => setEsMismoOperadorVe(data?.es_operador_venezuela_mismo ?? false));
  }, [negocioId]);

  const copiarEnlace = async () => {
    if (!enlaceCliente) return;
    await Clipboard.setStringAsync(enlaceCliente);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const enviarBienvenida = async (id: string, nombre: string, telefono: string | null) => {
    const enlace = construirEnlaceWhatsAppGenerico(telefono, mensajeBienvenida(nombre));
    if (!enlace) return;
    await Linking.openURL(enlace);
    setEnviados((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setEnviados((prev) => ({ ...prev, [id]: false })), 3000);
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
    cargarEquipos();
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
    cargarEquipos();
  };

  const agregarVe = async () => {
    if (!negocioId) return;
    setErrorVe(null);
    if (veList.length >= LIMITE_EQUIPO_VENEZUELA) {
      setErrorVe(`Alcanzaste el límite de ${LIMITE_EQUIPO_VENEZUELA} operadores en Venezuela de tu plan.`);
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
    cargarEquipos();
  };

  const agregarPe = async () => {
    if (!negocioId) return;
    setErrorPe(null);
    if (peList.length >= LIMITE_EQUIPO_PERU) {
      setErrorPe(`Alcanzaste el límite de ${LIMITE_EQUIPO_PERU} miembro(s) de equipo en Perú de tu plan.`);
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
    cargarEquipos();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Operador Perú'}</Text>
      <Text style={styles.email}>{usuario?.email}</Text>
      <Text style={styles.telefono}>{usuario?.telefono}</Text>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>Invitar clientes</Text>
        <Text style={styles.cardTexto}>
          Un solo enlace para todos tus clientes — compártelo por WhatsApp. Quien lo abra entra directo como tu cliente.
        </Text>
        {generando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : (
          enlaceCliente && (
            <View style={styles.enlaceRow}>
              <Text style={styles.enlaceTexto} numberOfLines={1}>
                {enlaceCliente}
              </Text>
              <Pressable style={styles.copiarBtn} onPress={copiarEnlace}>
                <Text style={styles.copiarBtnTexto}>{copiado ? '✓ Copiado' : 'Copiar'}</Text>
              </Pressable>
            </View>
          )
        )}
      </View>

      {esDueno && <PlanesInfo />}

      {esDueno && usuario && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>TU PLAN</Text>
          {usuario.plan === 'starter' ? (
            <Text style={styles.cardTexto}>Plan STARTER activo — S/ {PRECIO_STARTER_MENSUAL.toFixed(2)} / mes.</Text>
          ) : (
            <>
              <Text style={styles.cardTexto}>
                Plan DEMO — quedan {diasRestantesDemo(usuario.demo_inicio)} días
                {usuario.demo_inicio ? ` (vence el ${FORMATTER_FECHA.format(fechaFinDemo(usuario.demo_inicio))})` : ''}.
              </Text>
              {solicitandoStarter ? (
                <FormularioSolicitudPlan onEnviado={() => setSolicitandoStarter(false)} />
              ) : (
                <Pressable style={styles.agregarBtn} onPress={() => setSolicitandoStarter(true)}>
                  <Text style={styles.agregarBtnTexto}>Solicitar plan STARTER (S/ {PRECIO_STARTER_MENSUAL.toFixed(2)} / mes)</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      {!esMismoOperadorVe && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>
            OPERADORES EN VENEZUELA - EQUIPO ({veList.length}/{LIMITE_EQUIPO_VENEZUELA})
          </Text>
          {veList.length === 0 && <Text style={styles.cardTexto}>Todavía no hay ninguno registrado.</Text>}
          {veList.map((v) => (
            <OperadorFila
              key={v.id}
              nombre={v.nombre}
              email={v.email ?? ''}
              telefono={v.telefono ?? ''}
              editable={esDueno}
              enviado={!!enviados[v.id]}
              onCambiarNombre={(t) => editarVe(v.id, 'nombre', t)}
              onCambiarTelefono={(t) => editarVe(v.id, 'telefono', t)}
              onCambiarEmail={(t) => editarVe(v.id, 'email', t)}
              onEliminar={() => eliminarVe(v.id)}
              onEnviar={() => enviarBienvenida(v.id, v.nombre, v.telefono)}
            />
          ))}

          {esDueno &&
            (veList.length >= LIMITE_EQUIPO_VENEZUELA ? (
              <Text style={styles.limiteTexto}>Alcanzaste el límite de {LIMITE_EQUIPO_VENEZUELA} operadores en Venezuela de tu plan.</Text>
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
            ))}
        </View>
      )}

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>
          OPERADORES EN PERÚ - EQUIPO ({peList.length}/{LIMITE_EQUIPO_PERU})
        </Text>
        {peList.length === 0 && <Text style={styles.cardTexto}>Todavía no hay ningún miembro agregado.</Text>}
        {peList.map((p) => (
          <OperadorFila
            key={p.id}
            nombre={p.nombre}
            email={p.email}
            telefono={p.telefono ?? ''}
            editable={esDueno}
            enviado={!!enviados[p.id]}
            onCambiarNombre={(t) => editarPe(p.id, 'nombre', t)}
            onCambiarTelefono={(t) => editarPe(p.id, 'telefono', t)}
            onCambiarEmail={(t) => editarPe(p.id, 'email', t)}
            onEliminar={() => eliminarPe(p.id)}
            onEnviar={() => enviarBienvenida(p.id, p.nombre, p.telefono)}
          />
        ))}

        {esDueno &&
          (peList.length >= LIMITE_EQUIPO_PERU ? (
            <Text style={styles.limiteTexto}>Alcanzaste el límite de {LIMITE_EQUIPO_PERU} miembro(s) de equipo en Perú de tu plan.</Text>
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
          ))}
      </View>

      {esDueno && (
        <Pressable style={styles.buttonOutline} onPress={() => router.push('/(operador-peru)/onboarding')}>
          <Text style={styles.buttonOutlineText}>Editar datos del negocio</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// Fila de un miembro del equipo (VE o Perú): si `editable` es true (dueño
// del negocio) los campos se editan in-line y se guardan al perder el
// foco, más un botón para eliminar. Si no, se muestran de solo lectura
// (así lo ve un miembro del equipo, que solo puede consultar la lista).
// El botón de WhatsApp está disponible para cualquiera que vea la fila.
function OperadorFila({
  nombre,
  email,
  telefono,
  editable,
  enviado,
  onCambiarNombre,
  onCambiarTelefono,
  onCambiarEmail,
  onEliminar,
  onEnviar,
}: {
  nombre: string;
  email: string;
  telefono: string;
  editable: boolean;
  enviado: boolean;
  onCambiarNombre: (v: string) => void;
  onCambiarTelefono: (v: string) => void;
  onCambiarEmail: (v: string) => void;
  onEliminar: () => void;
  onEnviar: () => void;
}) {
  const [nombreLocal, setNombreLocal] = useState(nombre);
  const [telefonoLocal, setTelefonoLocal] = useState(telefono);
  const [emailLocal, setEmailLocal] = useState(email);

  if (!editable) {
    return (
      <View style={styles.miembroFila}>
        <Text style={styles.miembroNombre}>{nombre}</Text>
        {!!email && <Text style={styles.miembroDato}>{email}</Text>}
        {!!telefono && <Text style={styles.miembroDato}>{telefono}</Text>}
        {!!telefono && (
          <Pressable style={styles.enviarMsjBtn} onPress={onEnviar}>
            <Text style={styles.enviarMsjBtnTexto}>{enviado ? '✓ Abierto en WhatsApp' : 'Enviar mensaje'}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.miembroFila}>
      <View style={styles.miembroHeaderRow}>
        <TextInput
          style={[styles.input, styles.miembroInputNombre]}
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
        style={styles.input}
        value={telefonoLocal}
        onChangeText={setTelefonoLocal}
        onBlur={() => onCambiarTelefono(telefonoLocal)}
        keyboardType="phone-pad"
        placeholder="Teléfono"
        placeholderTextColor={colors.textMuted}
      />
      <TextInput
        style={styles.input}
        value={emailLocal}
        onChangeText={setEmailLocal}
        onBlur={() => emailLocal.trim() && onCambiarEmail(emailLocal)}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={colors.textMuted}
      />
      {!!telefonoLocal && (
        <Pressable style={styles.enviarMsjBtn} onPress={onEnviar}>
          <Text style={styles.enviarMsjBtnTexto}>{enviado ? '✓ Abierto en WhatsApp' : 'Enviar mensaje'}</Text>
        </Pressable>
      )}
    </View>
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
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  nombre: { color: colors.text, fontSize: 22, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 14, marginTop: -8 },
  telefono: { color: colors.textMuted, fontSize: 14, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 14, fontWeight: '800' },
  cardTexto: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center' },
  botonTexto: { color: colors.text, fontWeight: '700' },
  enlaceRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  enlaceTexto: { flex: 1, minWidth: 0, color: colors.accent, fontSize: 12 },
  copiarBtn: { backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  copiarBtnTexto: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  miembroFila: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4, gap: 2 },
  miembroHeaderRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  miembroInputNombre: { flex: 1, minWidth: 0, marginTop: 0 },
  miembroEliminarBtn: { padding: 8 },
  miembroEliminarTexto: { color: colors.danger, fontWeight: '800', fontSize: 14 },
  miembroNombre: { color: colors.text, fontSize: 14, fontWeight: '700' },
  miembroDato: { color: colors.textMuted, fontSize: 12 },
  enviarMsjBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  enviarMsjBtnTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
  agregarBtn: { marginTop: 10, alignSelf: 'flex-start' },
  agregarBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  limiteTexto: { color: colors.warning, fontSize: 12, fontWeight: '600', marginTop: 10 },
  nuevoBloque: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 15,
    marginTop: 5,
    backgroundColor: colors.cardAlt,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  nuevoAccionesRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  guardarNuevoBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  guardarNuevoBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 13 },
  cancelarNuevoBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  cancelarNuevoBtnTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
});
