import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Linking, Platform, Alert, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { registrarPushToken } from '../../lib/notifications';
import { reservarPestanaExterna } from '../../lib/pestanaExterna';
import { construirEnlaceWhatsAppGenerico } from '../../lib/whatsapp';
import {
  DOCUMENTO_TIPO_ETIQUETA,
  documentoClienteCompleto,
  MAX_DOCUMENTO_IDENTIDAD_KB,
  MIME_DOCUMENTO_IDENTIDAD,
  extensionDocumentoIdentidad,
  arrayBufferABase64,
} from '../../lib/perfilCliente';
import { CanalNotificacion, DocumentoTipo } from '../../types/database';
import { InstalarAppCard } from '../../components/InstalarAppCard';
import { ZoomableImageModal } from '../../components/ZoomableImageModal';
import { colors, radius } from '../../constants/theme';

const OPCIONES_CANAL: { valor: CanalNotificacion; etiqueta: string }[] = [
  { valor: 'telegram', etiqueta: 'Telegram' },
  { valor: 'whatsapp', etiqueta: 'WhatsApp' },
  { valor: 'ambos', etiqueta: 'Ambos' },
];

const OPCIONES_DOCUMENTO: DocumentoTipo[] = ['DNI', 'CE', 'PASAPORTE', 'CPP', 'PPT', 'CI'];

const BOT_TELEGRAM = 'Remesaspv_bot';

// Edición de datos en la misma pantalla (sin navegar a otra ruta): antes
// "Editar mis datos" llevaba a /(auth)/registro (una pantalla ajena a este
// grupo de tabs) y al volver con router.replace('/(cliente)') se veía un
// salto a pantalla blanca. Editando in-place evitamos ese remount y el
// usuario nunca sale de la pestaña Perfil.
export default function Perfil() {
  const { usuario, refreshUsuario, signOut } = useAuth();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('');
  const [documentoTipo, setDocumentoTipo] = useState<DocumentoTipo | null>(null);
  const [documentoNumero, setDocumentoNumero] = useState('');
  const [documentoImagenNueva, setDocumentoImagenNueva] = useState<{ uri: string; ext: string; nombre: string } | null>(null);
  const [referidoNombre, setReferidoNombre] = useState('');
  const [referidoApellido, setReferidoApellido] = useState('');
  const [referidoTelefono, setReferidoTelefono] = useState('');
  const [zoomDocumento, setZoomDocumento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [conectandoTelegram, setConectandoTelegram] = useState(false);
  const [guardandoCanal, setGuardandoCanal] = useState(false);
  const [operador, setOperador] = useState<{ nombre: string; telefono: string | null; email: string | null } | null>(null);
  const [dandoDeBaja, setDandoDeBaja] = useState(false);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  // Operador de Perú que atiende a este cliente: si lo invitó un miembro de
  // Perú, es ese miembro (operador_peru_miembro); si lo invitó el negocio
  // directamente, es el Operador principal (usuarios). Reemplaza el antiguo
  // "Contacto de soporte", que siempre mostraba al principal sin importar
  // quién invitó realmente al cliente.
  useEffect(() => {
    if (!usuario?.negocio_operador_peru_id) return;
    if (usuario.invitado_por_operador_miembro_id) {
      supabase
        .from('operador_peru_miembro')
        .select('nombre, telefono, email')
        .eq('id', usuario.invitado_por_operador_miembro_id)
        .maybeSingle()
        .then(({ data }) => setOperador(data));
    } else {
      supabase
        .from('usuarios')
        .select('nombre, telefono, email')
        .eq('id', usuario.negocio_operador_peru_id)
        .maybeSingle()
        .then(({ data }) => setOperador(data));
    }
  }, [usuario?.negocio_operador_peru_id, usuario?.invitado_por_operador_miembro_id]);

  const enlaceWhatsAppOperador = operador
    ? construirEnlaceWhatsAppGenerico(operador.telefono, 'Hola, necesito ayuda con una solicitud en Remesas PERU-VENEZUELA.')
    : null;

  // El Image de RN no puede previsualizar un PDF -- se detecta por la
  // extensión elegida (archivo nuevo) o por la URL ya guardada, para
  // mostrar en su lugar una tarjeta con el nombre del archivo.
  const documentoActualEsPdf = documentoImagenNueva
    ? documentoImagenNueva.ext === 'pdf'
    : !!usuario?.documento_imagen_url?.toLowerCase().endsWith('.pdf');

  const contactarOperador = () => {
    if (!enlaceWhatsAppOperador) return;
    Linking.openURL(enlaceWhatsAppOperador);
  };

  // Al volver a esta pantalla (p.ej. tras vincular Telegram y regresar del
  // navegador/app de Telegram) se refresca el usuario para reflejar el
  // nuevo estado de conexión sin que el cliente tenga que hacer nada más.
  useFocusEffect(
    useCallback(() => {
      refreshUsuario();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const conectarTelegram = async () => {
    setConectandoTelegram(true);
    const pestana = reservarPestanaExterna();
    const { data: token, error: tokenError } = await supabase.rpc('generar_token_telegram_propio');
    setConectandoTelegram(false);
    if (tokenError || !token) {
      pestana.asignar(null);
      return;
    }
    pestana.asignar(`https://t.me/${BOT_TELEGRAM}?start=${token}`);
  };

  const elegirCanalNotificacion = async (valor: CanalNotificacion) => {
    if (!usuario || valor === usuario.canal_notificacion) return;
    setGuardandoCanal(true);
    const { error: updateError } = await supabase.from('usuarios').update({ canal_notificacion: valor }).eq('id', usuario.id);
    setGuardandoCanal(false);
    if (updateError) {
      if (Platform.OS === 'web') window.alert(updateError.message);
      else Alert.alert('No se pudo guardar', updateError.message);
      return;
    }
    await refreshUsuario();
  };

  // Baja de cuenta a pedido del propio cliente: mismo mecanismo que usa el
  // operador Perú para eliminar a un cliente (función `eliminar-cliente`)
  // -- borra su acceso (auth) y marca `eliminado_at`, pero conserva su fila
  // en `usuarios` para que sus solicitudes anteriores sigan íntegras en los
  // reportes del operador. Al terminar, se cierra la sesión localmente
  // porque su cuenta ya no existe del lado del servidor.
  const darseDeBaja = () => {
    const confirmarYDarseDeBaja = async () => {
      if (!usuario) return;
      setDandoDeBaja(true);
      const { data, error: invokeError } = await supabase.functions.invoke('eliminar-cliente', {
        body: { cliente_id: usuario.id },
      });
      let mensajeError: string | null = null;
      if (invokeError) {
        mensajeError = invokeError.message;
        const contexto = (invokeError as { context?: unknown }).context;
        if (contexto instanceof Response) {
          try {
            const cuerpo = await contexto.json();
            if (cuerpo?.error) mensajeError = cuerpo.error;
          } catch {
            // Respuesta sin JSON válido: se mantiene invokeError.message.
          }
        } else if ((data as { error?: string } | null)?.error) {
          mensajeError = (data as { error: string }).error;
        }
      }
      if (mensajeError) {
        setDandoDeBaja(false);
        if (Platform.OS === 'web') window.alert(mensajeError);
        else Alert.alert('No se pudo dar de baja tu cuenta', mensajeError);
        return;
      }
      await signOut();
    };

    const mensaje =
      '¿Seguro que deseas darte de baja? Perderás el acceso a la app; tus solicitudes anteriores se conservarán en los reportes de tu operador. Esta acción no se puede deshacer.';
    if (Platform.OS === 'web') {
      if (window.confirm(mensaje)) confirmarYDarseDeBaja();
      return;
    }
    Alert.alert('Dar de baja mi cuenta', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Dar de baja', style: 'destructive', onPress: confirmarYDarseDeBaja },
    ]);
  };

  const empezarEdicion = () => {
    setNombre(usuario?.nombre ?? '');
    setTelefono(usuario?.telefono ?? '');
    setPais(usuario?.pais ?? '');
    setDocumentoTipo(usuario?.documento_tipo ?? null);
    setDocumentoNumero(usuario?.documento_numero ?? '');
    setDocumentoImagenNueva(null);
    setReferidoNombre(usuario?.referido_nombre ?? '');
    setReferidoApellido(usuario?.referido_apellido ?? '');
    setReferidoTelefono(usuario?.referido_telefono ?? '');
    setError(null);
    setGuardado(false);
    setEditando(true);
  };

  const cancelar = () => {
    setEditando(false);
    setError(null);
  };

  // A diferencia del comprobante de pago (foto tomada al momento), el
  // Documento de identidad suele ser un escaneo o PDF ya guardado -- por
  // eso acá se usa el selector de archivos (expo-document-picker), que sí
  // deja elegir PDF, en vez del selector de fotos (expo-image-picker).
  const elegirImagenDocumento = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: MIME_DOCUMENTO_IDENTIDAD,
      copyToCacheDirectory: true,
    });
    if (resultado.canceled || !resultado.assets?.[0]) return;
    const asset = resultado.assets[0];
    if (asset.size != null && asset.size > MAX_DOCUMENTO_IDENTIDAD_KB * 1024) {
      Alert.alert(
        'Archivo muy pesado',
        `"${asset.name}" pesa ${(asset.size / 1024 / 1024).toFixed(1)} MB y el límite es ${MAX_DOCUMENTO_IDENTIDAD_KB / 1000} MB. Comprime el archivo (o toma la foto con menor calidad) e inténtalo de nuevo.`
      );
      return;
    }
    setDocumentoImagenNueva({
      uri: asset.uri,
      ext: extensionDocumentoIdentidad(asset.mimeType, asset.name),
      nombre: asset.name,
    });
  };

  const guardar = async () => {
    if (!usuario) return;
    setError(null);
    if (!nombre.trim() || !telefono.trim() || !pais.trim()) {
      setError('Completa todos los campos.');
      return;
    }
    if (!documentoTipo || !documentoNumero.trim()) {
      setError('Indica el tipo y número de tu Documento de Identidad.');
      return;
    }
    if (!documentoImagenNueva && !usuario.documento_imagen_url) {
      setError('Adjunta una imagen de tu Documento de Identidad.');
      return;
    }
    setGuardando(true);

    let documentoImagenUrl = usuario.documento_imagen_url;
    if (documentoImagenNueva) {
      // La subida se hace vía Edge Function (service_role) en vez de un
      // insert directo del cliente a storage.objects: ese insert directo
      // fallaba en producción con "new row violates row-level security
      // policy" pese a que las policies de Storage son correctas -- ver
      // supabase/functions/subir-documento-identidad/index.ts.
      const arrayBuffer = await (await fetch(documentoImagenNueva.uri)).arrayBuffer();
      const archivo_base64 = arrayBufferABase64(arrayBuffer);
      const { data: subida, error: uploadError } = await supabase.functions.invoke('subir-documento-identidad', {
        body: { archivo_base64, ext: documentoImagenNueva.ext },
      });
      if (uploadError || !subida?.url) {
        setGuardando(false);
        setError(uploadError?.message ?? subida?.error ?? 'No se pudo subir el documento.');
        return;
      }
      documentoImagenUrl = subida.url as string;
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        pais: pais.trim(),
        documento_tipo: documentoTipo,
        documento_numero: documentoNumero.trim(),
        documento_imagen_url: documentoImagenUrl,
        referido_nombre: referidoNombre.trim() || null,
        referido_apellido: referidoApellido.trim() || null,
        referido_telefono: referidoTelefono.trim() || null,
      })
      .eq('id', usuario.id);
    setGuardando(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await refreshUsuario();
    setEditando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  if (editando) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.tituloPagina}>Perfil y Contacto</Text>
        <Text style={styles.nombre}>Editar mis datos</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          placeholder="+51 999 999 999"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>País</Text>
        <TextInput style={styles.input} value={pais} onChangeText={setPais} placeholderTextColor={colors.textMuted} />

        <Text style={styles.seccionTitulo}>Documento de Identidad (obligatorio)</Text>
        <Text style={styles.seccionTexto}>Lo necesitamos para poder verificar tu primera solicitud de remesa.</Text>

        <Text style={styles.label}>Tipo de documento</Text>
        <View style={styles.docChipsRow}>
          {OPCIONES_DOCUMENTO.map((op) => (
            <Pressable
              key={op}
              style={[styles.docChip, documentoTipo === op && styles.docChipActivo]}
              onPress={() => setDocumentoTipo(op)}
            >
              <Text style={[styles.docChipTexto, documentoTipo === op && styles.docChipTextoActivo]}>
                {DOCUMENTO_TIPO_ETIQUETA[op]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Número de documento</Text>
        <TextInput
          style={styles.input}
          value={documentoNumero}
          onChangeText={setDocumentoNumero}
          autoCapitalize="characters"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Foto o PDF del documento</Text>
        <Text style={styles.docAyuda}>
          Formatos aceptados: JPG, PNG o PDF · Tamaño máximo {MAX_DOCUMENTO_IDENTIDAD_KB / 1000} MB. Si tu archivo pesa
          más, comprímelo (o reduce la calidad de la foto) antes de subirlo.
        </Text>

        {documentoActualEsPdf ? (
          <View style={styles.docPdfCard}>
            <Text style={styles.docPdfIcono}>📄</Text>
            <Text style={styles.docPdfNombre} numberOfLines={2}>
              {documentoImagenNueva ? documentoImagenNueva.nombre : 'Documento en PDF adjunto'}
            </Text>
          </View>
        ) : (
          (documentoImagenNueva || usuario?.documento_imagen_url) && (
            <Pressable onPress={() => setZoomDocumento(true)}>
              <Image
                source={{ uri: documentoImagenNueva ? documentoImagenNueva.uri : usuario!.documento_imagen_url! }}
                style={styles.docPreview}
                resizeMode="contain"
              />
            </Pressable>
          )
        )}

        <Pressable style={styles.docUploadZone} onPress={elegirImagenDocumento}>
          <Text style={styles.docUploadIcono}>📎</Text>
          <Text style={styles.docUploadTexto}>
            {documentoImagenNueva || usuario?.documento_imagen_url ? 'Cambiar archivo' : 'Toca para elegir la foto o el PDF de tu documento'}
          </Text>
        </Pressable>

        <Text style={styles.seccionTitulo}>¿Quién te recomendó? (opcional)</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={referidoNombre} onChangeText={setReferidoNombre} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Apellido</Text>
        <TextInput style={styles.input} value={referidoApellido} onChangeText={setReferidoApellido} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          value={referidoTelefono}
          onChangeText={setReferidoTelefono}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textMuted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Guardar</Text>}
        </Pressable>
        <Pressable style={styles.buttonOutline} onPress={cancelar} disabled={guardando}>
          <Text style={styles.buttonOutlineText}>Cancelar</Text>
        </Pressable>

        <ZoomableImageModal
          visible={zoomDocumento}
          uri={documentoImagenNueva ? documentoImagenNueva.uri : (usuario?.documento_imagen_url ?? null)}
          onClose={() => setZoomDocumento(false)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.tituloPagina}>Perfil y Contacto</Text>
      <Text style={styles.nombre}>{usuario?.nombre ?? 'Cliente'}</Text>
      <Text style={styles.dato}>{usuario?.email}</Text>
      <Text style={styles.dato}>{usuario?.telefono}</Text>
      <Text style={styles.datoUltimo}>{usuario?.pais}</Text>

      {guardado && <Text style={styles.exito}>✓ Datos guardados satisfactoriamente</Text>}

      {documentoClienteCompleto(usuario) ? (
        <View style={styles.docResumen}>
          <Text style={styles.docResumenTexto}>
            {DOCUMENTO_TIPO_ETIQUETA[usuario!.documento_tipo!]} · {usuario!.documento_numero}
          </Text>
        </View>
      ) : (
        <Text style={styles.avisoDocumento}>
          ⚠ Te falta completar tu Documento de Identidad -- es obligatorio para poder enviar tu primera solicitud.
        </Text>
      )}

      {(usuario?.referido_nombre || usuario?.referido_telefono) && (
        <Text style={styles.dato}>
          Recomendado por: {[usuario?.referido_nombre, usuario?.referido_apellido].filter(Boolean).join(' ')}
          {usuario?.referido_telefono ? ` · ${usuario.referido_telefono}` : ''}
        </Text>
      )}

      <Pressable style={styles.buttonOutline} onPress={empezarEdicion}>
        <Text style={styles.buttonOutlineText}>Editar mis datos</Text>
      </Pressable>

      <View style={styles.contactoCard}>
        <Text style={styles.telegramTitulo}>Tu operador de Perú</Text>
        {operador ? (
          <>
            <Text style={styles.operadorNombre}>{operador.nombre}</Text>
            <Text style={styles.operadorDato}>{operador.email ?? 'Sin correo'}</Text>
            <Text style={styles.operadorDato}>{operador.telefono ?? 'Sin teléfono'}</Text>
            {enlaceWhatsAppOperador && (
              <Pressable style={styles.whatsappBtn} onPress={contactarOperador}>
                <Text style={styles.whatsappBtnTexto} numberOfLines={2}>
                  Enviar WhatsApp a {operador.nombre}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>

      <View style={styles.telegramCard}>
        <Text style={styles.telegramTitulo}>¿Cómo quieres recibir el aviso de tus depósitos?</Text>
        <Text style={styles.telegramDato}>Te avisamos apenas se valide cada depósito, en Perú y en Venezuela.</Text>
        <View style={styles.canalRow}>
          {OPCIONES_CANAL.map((op) => {
            const activo = (usuario?.canal_notificacion ?? 'ambos') === op.valor;
            return (
              <Pressable
                key={op.valor}
                style={[styles.canalChip, activo && styles.canalChipActivo]}
                onPress={() => elegirCanalNotificacion(op.valor)}
                disabled={guardandoCanal}
              >
                <Text style={[styles.canalChipTexto, activo && styles.canalChipTextoActivo]}>{op.etiqueta}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.telegramCard}>
        <Text style={styles.telegramTitulo}>Notificaciones por Telegram</Text>
        {usuario?.telegram_connected ? (
          <Text style={styles.exito}>✓ Telegram conectado{usuario.telegram_username ? ` (@${usuario.telegram_username})` : ''}</Text>
        ) : (
          <>
            <Text style={styles.telegramDato}>Conecta tu Telegram para recibir el aviso apenas se valide tu depósito en Perú.</Text>
            <Pressable style={styles.buttonOutline} onPress={conectarTelegram} disabled={conectandoTelegram}>
              {conectandoTelegram ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.buttonOutlineText}>Conectar Telegram</Text>}
            </Pressable>
          </>
        )}
      </View>

      <InstalarAppCard />

      <Pressable style={styles.bajaBtn} onPress={darseDeBaja} disabled={dandoDeBaja}>
        {dandoDeBaja ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.bajaBtnTexto}>Dar de baja mi cuenta</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, gap: 12, paddingBottom: 48 },
  tituloPagina: { color: colors.text, fontSize: 23, fontWeight: '800', flexShrink: 1, flexWrap: 'wrap' },
  nombre: { color: colors.text, fontSize: 25, fontWeight: '800', flexShrink: 1, flexWrap: 'wrap' },
  dato: { color: colors.textMuted, fontSize: 16, marginTop: -8 },
  datoUltimo: { color: colors.textMuted, fontSize: 16, marginTop: -8, marginBottom: 12 },
  exito: { color: colors.success, fontSize: 15, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 15, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    color: colors.text,
    fontSize: 18,
    marginTop: 6,
    backgroundColor: colors.card,
  },
  error: { color: colors.danger, fontSize: 15 },
  seccionTitulo: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 18 },
  seccionTexto: { color: colors.textMuted, fontSize: 14, marginTop: -2, marginBottom: 2 },
  docChipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  docChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  docChipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  docChipTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  docChipTextoActivo: { color: colors.text },
  docAyuda: { color: colors.textMuted, fontSize: 13, lineHeight: 17, marginTop: 2 },
  docPreview: { width: '100%', height: 260, borderRadius: radius.md, backgroundColor: colors.cardAlt, marginTop: 10 },
  docPdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    padding: 16,
    marginTop: 10,
  },
  docPdfIcono: { fontSize: 32 },
  docPdfNombre: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1, flexShrink: 1 },
  docUploadZone: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  docUploadIcono: { fontSize: 28 },
  docUploadTexto: { color: colors.accent, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  docResumen: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, marginTop: -4 },
  docResumenTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
  avisoDocumento: { color: colors.danger, fontSize: 14, fontWeight: '600', lineHeight: 18, marginTop: -4 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 18 },
  buttonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  buttonOutlineText: { color: colors.accent, fontWeight: '700' },
  telegramCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, gap: 10, marginTop: 8 },
  canalRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  canalChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  canalChipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  canalChipTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
  canalChipTextoActivo: { color: colors.text },
  telegramTitulo: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1, flexWrap: 'wrap' },
  telegramDato: { color: colors.textMuted, fontSize: 15, flexShrink: 1, flexWrap: 'wrap' },
  contactoCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, gap: 10, marginTop: 8 },
  operadorNombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  operadorDato: { color: colors.textMuted, fontSize: 14 },
  whatsappBtn: { backgroundColor: colors.success, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  whatsappBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center', flexShrink: 1, flexWrap: 'wrap' },
  bajaBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 16 },
  bajaBtnTexto: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
