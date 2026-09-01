import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { CopyField } from './CopyField';
import { extensionDeImagen, validarTamanoImagen, mimeDeExtension, MAX_IMAGEN_KB } from '../lib/imagenUtil';
import { ConfiguracionPagosAdmin } from '../types/database';
import { PRECIO_PLAN, planLabel, precioPlanMedida, tramoPlanMedida, NOMBRE_PLAN, PRECIO_MEDIDA_POR_CLIENTE } from '../lib/plan';
import { construirEnlaceWhatsAppAdmin } from '../lib/whatsapp';
import { colors, radius, cardShadow } from '../constants/theme';

const periodoActual = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

type FormaPago = 'yape' | 'transferencia';

// UNLIMITED no tiene tarifa fija, formas de pago ni comprobante que
// mostrar todavía -- se acuerda por WhatsApp con el administrador antes
// de que exista ningún monto que pagar. Por eso FormularioSolicitudPlan
// delega en este componente aparte para ese plan puntual, en vez de
// mostrar el formulario completo (formas de pago/comprobante/términos)
// con un monto que el cliente todavía no conoce.
function SolicitudUnlimited({ modo, onEnviado }: { modo: 'nueva' | 'cambio'; onEnviado?: () => void }) {
  const { usuario, refreshUsuario } = useAuth();
  const [cupoSolicitado, setCupoSolicitado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  if (!usuario) return null;

  const consultarPorWhatsApp = async () => {
    setError(null);
    const cupo = parseInt(cupoSolicitado, 10);
    if (!cupo || cupo <= 0) {
      setError('Indica cuántos clientes necesitas atender.');
      return;
    }
    setEnviando(true);
    try {
      if (modo === 'nueva') {
        const { error: upsertError } = await supabase.from('pagos_suscripcion').upsert(
          {
            operador_peru_id: usuario.id,
            periodo: periodoActual(),
            monto: 0,
            monto_por_definir: true,
            limite_clientes: cupo,
            comprobante_url: null,
            estado: 'pendiente',
          },
          { onConflict: 'operador_peru_id,periodo' }
        );
        if (upsertError) throw upsertError;
      } else {
        const { error: insertError } = await supabase.from('cambios_plan_pendientes').insert({
          operador_peru_id: usuario.id,
          plan_solicitado: 'unlimited',
          monto: 0,
          monto_por_definir: true,
          limite_clientes: cupo,
          comprobante_url: null,
          estado: 'pendiente',
        });
        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Ya tienes una solicitud de renovación/cambio de plan en curso.');
          }
          throw insertError;
        }
      }

      const mensaje = `Hola! Soy ${usuario.nombre} (${usuario.email}). Quiero consultar la tarifa del plan UNLIMITED para mi negocio en Remesas PERÚ-VENEZUELA -- necesito atender hasta ${cupo} clientes.`;
      Linking.openURL(construirEnlaceWhatsAppAdmin(mensaje));
      await refreshUsuario();
      setEnviado(true);
      onEnviado?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la consulta.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Plan UNLIMITED</Text>
        <Text style={styles.avisoTexto}>
          El plan UNLIMITED no tiene una tarifa fija: se acuerda directamente con el administrador según el volumen de tu
          negocio. Indica cuántos clientes necesitas atender y toca el botón para consultarlo por WhatsApp -- quedará
          registrado en tu perfil como "a consultar" hasta que el administrador te confirme el monto y el cupo.
        </Text>
        <Text style={styles.label}>¿Cuántos clientes necesitas atender?</Text>
        <TextInput
          style={styles.input}
          value={cupoSolicitado}
          onChangeText={setCupoSolicitado}
          keyboardType="numeric"
          placeholder="Ej: 2000"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {enviado ? (
        <Text style={styles.avisoTexto}>✅ Ya avisamos al administrador. En breve te confirmará el monto acordado.</Text>
      ) : (
        <Pressable style={styles.enviarBtn} onPress={consultarPorWhatsApp} disabled={enviando}>
          {enviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.enviarBtnTexto}>💬 Consultar por WhatsApp</Text>}
        </Pressable>
      )}
    </View>
  );
}

// Formulario de solicitud de pago de la suscripción. Tiene dos modos:
//
//   * 'nueva' -- no hay ningún plan pagado vigente (DEMO, nunca pagó, o
//     el ciclo anterior ya venció): upsert en pagos_suscripcion, igual
//     que siempre. Lo usa SuscripcionGate.
//   * 'cambio' -- ya hay un plan pagado vigente y esto es una renovación
//     o cambio adelantado: inserta en cambios_plan_pendientes en vez de
//     pagos_suscripcion (esa tabla es única por (operador_peru_id,
//     periodo) = mes calendario, y una renovación pagada unos días antes
//     de vencer cae muy seguido en el MISMO mes que el pago vigente --
//     pisaría esa fila ya verificada). El admin valida con
//     admin_validar_cambio_plan, que decide solo si se activa de
//     inmediato o queda en espera hasta que termine el ciclo actual. Lo
//     usa Perfil (aviso de renovación / "Próxima Meta").
//
// UNLIMITED no tiene precio fijo -- se acuerda por WhatsApp con el
// administrador (ver SolicitudUnlimited arriba). Una vez que el admin le
// fija el monto (panel-control.tsx -> RPC admin_fijar_precio_unlimited),
// `montoUnlimitedAcordado` ya viene definido y este componente muestra el
// mismo formulario de pago (formas de pago/comprobante/términos) que
// cualquier otro plan, en vez de volver a pedirle que consulte. El envío
// va por el RPC operador_pagar_unlimited (ver más abajo) -- encuentra
// sola la fila correcta, sea pagos_suscripcion o cambios_plan_pendientes.
//
// Este componente nunca llama hooks condicionalmente: simplemente elige a
// cuál de los dos delegar según el plan, sin lógica propia.
export function FormularioSolicitudPlan(props: {
  plan: string;
  modo: 'nueva' | 'cambio';
  onEnviado?: () => void;
  montoUnlimitedAcordado?: number;
  // Solo plan 'medida': N° de clientes que el operador solicita. El monto
  // (= N × S/ 1) y el cupo se derivan de acá -- ver lib/plan.ts.
  clientesAMedida?: number;
}) {
  if (props.plan === 'unlimited' && !props.montoUnlimitedAcordado) {
    return <SolicitudUnlimited modo={props.modo} onEnviado={props.onEnviado} />;
  }
  return (
    <FormularioSolicitudPlanFijo
      plan={props.plan}
      modo={props.modo}
      onEnviado={props.onEnviado}
      montoOverride={props.montoUnlimitedAcordado}
      clientesAMedida={props.clientesAMedida}
    />
  );
}

// El monto define qué plan asigna el admin al aprobar (ver
// planDesdeMonto) -- para todo plan salvo UNLIMITED viene de PRECIO_PLAN;
// para UNLIMITED con precio ya acordado, `montoOverride` lo trae desde
// afuera (PRECIO_PLAN no tiene entrada para 'unlimited').
function FormularioSolicitudPlanFijo({
  plan,
  modo,
  onEnviado,
  montoOverride,
  clientesAMedida,
}: {
  plan: string;
  modo: 'nueva' | 'cambio';
  onEnviado?: () => void;
  montoOverride?: number;
  clientesAMedida?: number;
}) {
  const { usuario, refreshUsuario } = useAuth();
  const [config, setConfig] = useState<ConfiguracionPagosAdmin | null>(null);
  const [formaPago, setFormaPago] = useState<FormaPago>('yape');
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [comprobanteExt, setComprobanteExt] = useState('jpg');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const esMedida = plan === 'medida';
  const nClientesMedida = Math.round(clientesAMedida ?? 0);
  const monto = esMedida ? precioPlanMedida(nClientesMedida) : (montoOverride ?? PRECIO_PLAN[plan]);
  const tramoMedida = esMedida ? tramoPlanMedida(nClientesMedida) : null;

  useEffect(() => {
    supabase
      .from('configuracion_pagos_admin')
      .select('*')
      .maybeSingle()
      .then(({ data }) => setConfig(data as ConfiguracionPagosAdmin | null));
  }, []);

  const elegirComprobante = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (resultado.canceled) return;
    if (!(await validarTamanoImagen(resultado.assets[0]))) {
      Alert.alert('Imagen muy pesada', `La imagen supera el límite de ${MAX_IMAGEN_KB} KB. Elige una más liviana.`);
      return;
    }
    setComprobanteUri(resultado.assets[0].uri);
    setComprobanteExt(extensionDeImagen(resultado.assets[0]));
  };

  const enviarSolicitud = async () => {
    setError(null);
    if (!usuario) return;
    if (!aceptaTerminos) {
      setError('Debes leer y aceptar los Términos y Condiciones para enviar la solicitud.');
      return;
    }
    if (!nombre.trim() || !telefono.trim()) {
      setError('Completa tu nombre completo y teléfono.');
      return;
    }
    if (!comprobanteUri) {
      setError('Sube el comprobante de tu depósito.');
      return;
    }

    setEnviando(true);
    try {
      await supabase.from('usuarios').update({ nombre: nombre.trim(), telefono: telefono.trim() }).eq('id', usuario.id);

      const carpeta = modo === 'nueva' ? 'suscripciones' : 'suscripciones-cambio';
      const nombreArchivo = modo === 'nueva' ? periodoActual() : `${Date.now()}`;
      const path = `${carpeta}/${usuario.id}/${nombreArchivo}.${comprobanteExt}`;
      // arrayBuffer() en vez de blob(): en React Native fetch(...).blob() de
      // un archivo local es muy lento (ver lib/imagenUtil.ts).
      const arrayBuffer = await (await fetch(comprobanteUri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(path, arrayBuffer, { upsert: true, contentType: mimeDeExtension(comprobanteExt) });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);

      if (plan === 'unlimited') {
        // La fila ya existe (se creó al consultar y el admin ya le fijó el
        // monto -- ver SolicitudUnlimited/panel-control.tsx). Va por RPC en
        // vez de un UPDATE directo: las políticas RLS de
        // pagos_suscripcion/cambios_plan_pendientes no cubren que el
        // operador actualice una fila ya creada, solo insertarla o
        // reenviarla tras un rechazo.
        const { error: rpcError } = await supabase.rpc('operador_pagar_unlimited', { p_comprobante_url: publicUrl.publicUrl });
        if (rpcError) throw rpcError;
      } else if (modo === 'nueva') {
        const { error: upsertError } = await supabase.from('pagos_suscripcion').upsert(
          {
            operador_peru_id: usuario.id,
            periodo: periodoActual(),
            monto,
            comprobante_url: publicUrl.publicUrl,
            estado: 'pendiente',
            ...(esMedida ? { plan_a_medida: true, limite_clientes: nClientesMedida } : {}),
          },
          { onConflict: 'operador_peru_id,periodo' }
        );
        if (upsertError) throw upsertError;
      } else {
        const { error: insertError } = await supabase.from('cambios_plan_pendientes').insert({
          operador_peru_id: usuario.id,
          plan_solicitado: plan,
          monto,
          comprobante_url: publicUrl.publicUrl,
          estado: 'pendiente',
          ...(esMedida ? { plan_a_medida: true, limite_clientes: nClientesMedida } : {}),
        });
        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Ya tienes una solicitud de renovación/cambio de plan en curso.');
          }
          throw insertError;
        }
      }

      await refreshUsuario();
      onEnviado?.();
    } catch (err) {
      // Los errores de Supabase no son instancias de Error; igual traen
      // `message` -- mostrarlo en vez de un genérico que oculta la causa.
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'No se pudo enviar la solicitud.';
      setError(msg);
    } finally {
      setEnviando(false);
    }
  };

  if (!usuario) return null;

  if (esMedida && (nClientesMedida < 1 || tramoMedida === null)) {
    return (
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Plan a la medida</Text>
        <Text style={styles.avisoTexto}>
          {nClientesMedida < 1
            ? 'Indica cuántos clientes vas a registrar para calcular tu plan a la medida.'
            : 'Para más de 1000 clientes el plan a la medida no aplica: solicita el plan UNLIMITED y acuerda la tarifa con el administrador.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.subtitulo}>
        {esMedida
          ? `Solicitud de plan ${NOMBRE_PLAN.medida} — S/ ${monto.toFixed(2)} / mes (${nClientesMedida} clientes × S/ ${PRECIO_MEDIDA_POR_CLIENTE}) — incluye las características del plan ${NOMBRE_PLAN[tramoMedida!]} — período ${periodoActual()}`
          : `Solicitud de plan ${planLabel(plan)} — S/ ${monto.toFixed(2)} / mes — período ${periodoActual()}`}
      </Text>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Formas de pago</Text>
        <View style={styles.selectorRow}>
          <SelectorOpcion etiqueta="YAPE" seleccionado={formaPago === 'yape'} onPress={() => setFormaPago('yape')} />
          <SelectorOpcion etiqueta="Transferencia bancaria" seleccionado={formaPago === 'transferencia'} onPress={() => setFormaPago('transferencia')} />
        </View>

        {formaPago === 'yape' ? (
          <View style={{ marginTop: 4 }}>
            {config?.yape_telefono && <CopyField label="Yape" value={config.yape_telefono} />}
            {config?.plin_telefono && <CopyField label="Plin" value={config.plin_telefono} />}
            {config?.otro_medio_telefono && (
              <CopyField label={config.otro_medio_nombre || 'Otro medio de pago'} value={config.otro_medio_telefono} />
            )}
            {!config?.yape_telefono && !config?.plin_telefono && !config?.otro_medio_telefono && (
              <Text style={styles.avisoTexto}>El administrador todavía no cargó un teléfono de pago.</Text>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 4 }}>
            {config?.banco && <CopyField label="Banco" value={config.banco} />}
            {config?.cuenta_soles && <CopyField label="Cuenta soles" value={config.cuenta_soles} />}
            {config?.cci && <CopyField label="CCI" value={config.cci} />}
            {config?.titular && <CopyField label="Titular" value={config.titular} />}
          </View>
        )}
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Comprobante de depósito</Text>
        <Pressable style={styles.subirBtn} onPress={elegirComprobante}>
          {comprobanteUri ? (
            <Image source={{ uri: comprobanteUri }} style={styles.comprobantePreview} resizeMode="cover" />
          ) : (
            <Text style={styles.subirBtnTexto}>Elegir captura del depósito</Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Tus datos</Text>
        <Text style={styles.label}>Nombre completo</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Teléfono</Text>
        <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Correo electrónico</Text>
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={styles.inputDisabledText}>{usuario.email}</Text>
        </View>
      </View>

      <View style={[styles.card, cardShadow, styles.terminosBox]}>
        <Text style={styles.terminosTitulo}>Términos y condiciones de uso de la plataforma Remesas PERÚ-VENEZUELA</Text>
        <Text style={styles.terminosTexto}>
          Importante: antes de enviar tu solicitud de plan {planLabel(plan)} debes leer los Términos y Condiciones de Uso. Al
          marcar la aceptación declaras que los leíste, comprendiste y aceptas íntegramente. No se puede enviar la solicitud sin
          aceptarlos.
        </Text>
        <Pressable onPress={() => Linking.openURL('/legal/terminos-legales-remesas-peru-venezuela.pdf')}>
          <Text style={styles.linkPdf}>📁 Descargar TÉRMINOS LEGALES Y DE USO DE REMESAS PERÚ-VENEZUELA (PDF)</Text>
        </Pressable>
        <View style={styles.terminosAceptacion}>
          <TouchableOpacity onPress={() => setAceptaTerminos((v) => !v)} style={styles.checkboxContainer}>
            <Text style={[styles.checkbox, aceptaTerminos && styles.checkboxActivo]}>{aceptaTerminos ? '☑' : '☐'}</Text>
          </TouchableOpacity>
          <Text style={[styles.terminosTexto, styles.terminosTextoFlex, aceptaTerminos && styles.terminosTextoAceptado]}>
            {aceptaTerminos
              ? '✅ Términos y Condiciones aceptados.'
              : 'He leído y acepto los Términos y Condiciones de Uso.'}
          </Text>
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.enviarBtn, !aceptaTerminos && styles.enviarBtnDeshabilitado]} onPress={enviarSolicitud} disabled={enviando || !aceptaTerminos}>
        {enviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.enviarBtnTexto}>Enviar solicitud</Text>}
      </Pressable>
    </View>
  );
}

function SelectorOpcion({ etiqueta, seleccionado, onPress }: { etiqueta: string; seleccionado: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.opcion} onPress={onPress}>
      <View style={[styles.opcionCirculo, seleccionado && styles.opcionCirculoActivo]}>
        {seleccionado && <View style={styles.opcionPunto} />}
      </View>
      <Text style={[styles.opcionTexto, seleccionado && styles.opcionTextoActivo]}>{etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subtitulo: { color: colors.textMuted, fontSize: 15 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4, width: '100%' },
  seccionTitulo: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  avisoTexto: { color: colors.text, fontSize: 15, lineHeight: 19 },
  selectorRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opcionCirculo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionCirculoActivo: { borderColor: colors.success },
  opcionPunto: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success },
  opcionTexto: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  opcionTextoActivo: { color: colors.text, fontWeight: '800' },
  subirBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  subirBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  comprobantePreview: { width: '100%', height: 160, borderRadius: radius.sm },
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
  inputDisabled: { justifyContent: 'center', opacity: 0.7 },
  inputDisabledText: { color: colors.textMuted, fontSize: 17 },
  error: { color: colors.danger, fontSize: 15 },
  enviarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  enviarBtnDeshabilitado: { opacity: 0.5 },
  enviarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 18 },
  terminosBox: { borderColor: colors.primary, gap: 8 },
  terminosTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  terminosTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 18 },
  terminosTextoFlex: { flex: 1 },
  terminosTextoAceptado: { color: colors.success, fontWeight: '700' },
  linkPdf: { color: colors.accent, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  terminosAceptacion: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkboxContainer: { padding: 4 },
  checkbox: { fontSize: 23, color: colors.textMuted },
  checkboxActivo: { color: colors.success },
});
