import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { resolverContextoOperador } from '../../lib/sesionOperador';
import { obtenerOCrearInvitacionCliente, construirEnlaceLandingCliente } from '../../lib/invitaciones';
import { construirEnlaceWhatsAppGenerico } from '../../lib/whatsapp';
import { Collapsible } from '../../components/Collapsible';
import { colors, radius, cardShadow } from '../../constants/theme';
import {
  CONCEPTOS,
  ESTILOS,
  ENFOQUES,
  TAMANOS_RED_SOCIAL,
  MENSAJE_WHATSAPP_PREDEFINIDO,
  RedSocial,
  generarPublicacion,
  listarPublicaciones,
  descargarImagenDataUri,
  descargarImagenDesdeUrl,
} from '../../lib/automarketing';
import { PublicacionMarketing } from '../../types/database';

type Paso = 'inicio' | 'config' | 'generar' | 'resultado';

const REDES: RedSocial[] = ['facebook', 'instagram', 'tiktok'];
const FORMATTER_FECHA = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function Automarketing() {
  const { usuario } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [esPrincipal, setEsPrincipal] = useState(false);
  const [negocioId, setNegocioId] = useState<string | null>(null);

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [eslogan, setEslogan] = useState('');
  const [whatsappMarketing, setWhatsappMarketing] = useState('');
  const [estiloPreferido, setEstiloPreferido] = useState<string | null>(null);
  const [invitacionLink, setInvitacionLink] = useState<string | null>(null);

  const [paso, setPaso] = useState<Paso>('inicio');
  const [redSocial, setRedSocial] = useState<RedSocial | null>(null);
  const [enfoqueSel, setEnfoqueSel] = useState<string>('');
  const [conceptoSel, setConceptoSel] = useState<string>('');

  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [generando, setGenerando] = useState<null | 'todo' | 'imagen' | 'texto'>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pub, setPub] = useState<PublicacionMarketing | null>(null);
  const [historial, setHistorial] = useState<PublicacionMarketing[]>([]);

  const shotRef = useRef<ViewShotRef>(null);

  const waLink = whatsappMarketing.trim()
    ? construirEnlaceWhatsAppGenerico(whatsappMarketing, MENSAJE_WHATSAPP_PREDEFINIDO)
    : null;

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    const ctx = await resolverContextoOperador(usuario);
    if (ctx.tipo !== 'principal' || !ctx.negocioId) {
      setEsPrincipal(false);
      setCargando(false);
      return;
    }
    setEsPrincipal(true);
    setNegocioId(ctx.negocioId);

    const { data: perfil } = await supabase
      .from('perfil_negocio')
      .select('nombre_negocio, logo_url, eslogan, whatsapp_marketing, estilo_marketing_preferido')
      .eq('operador_peru_id', ctx.negocioId)
      .maybeSingle();
    if (perfil) {
      setNombreNegocio(perfil.nombre_negocio ?? '');
      setLogoUrl(perfil.logo_url);
      setEslogan(perfil.eslogan ?? '');
      setWhatsappMarketing(perfil.whatsapp_marketing ?? usuario.telefono ?? '');
      setEstiloPreferido(perfil.estilo_marketing_preferido ?? null);
    }

    try {
      const invitacion = await obtenerOCrearInvitacionCliente(ctx.negocioId);
      setInvitacionLink(construirEnlaceLandingCliente(invitacion.token));
    } catch {
      setInvitacionLink(null);
    }

    setHistorial(await listarPublicaciones(ctx.negocioId));
    setCargando(false);
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const irACrear = () => {
    if (!redSocial) return;
    setError(null);
    setPaso(whatsappMarketing.trim() ? 'generar' : 'config');
  };

  const guardarConfig = async () => {
    if (!negocioId) return;
    setError(null);
    if (!nombreNegocio.trim()) return setError('Escribe el nombre del negocio.');
    if (!whatsappMarketing.trim()) return setError('Escribe tu número de WhatsApp.');
    if (!construirEnlaceWhatsAppGenerico(whatsappMarketing, 'x')) {
      return setError('El número de WhatsApp no es válido. Escríbelo con código de país, ej. +51 999 999 999.');
    }
    setGuardandoConfig(true);
    const { error: err } = await supabase
      .from('perfil_negocio')
      .update({
        nombre_negocio: nombreNegocio.trim(),
        whatsapp_marketing: whatsappMarketing.trim(),
        estilo_marketing_preferido: estiloPreferido,
      })
      .eq('operador_peru_id', negocioId);
    setGuardandoConfig(false);
    if (err) return setError(err.message);
    setPaso('generar');
  };

  const generar = async (regenerarSolo?: 'imagen' | 'texto') => {
    if (!redSocial) return;
    setError(null);
    setGenerando(regenerarSolo ?? 'todo');
    try {
      const resultado = await generarPublicacion({
        red_social: redSocial,
        enfoque: enfoqueSel || undefined,
        concepto: conceptoSel || undefined,
        wa_link: waLink,
        invitacion_link: invitacionLink,
        regenerar_solo: regenerarSolo,
        imagen_url_previa: pub?.imagen_url,
        imagen_prompt_previo: pub?.imagen_prompt,
        texto_previo: pub?.texto,
      });
      setPub(resultado);
      setPaso('resultado');
      if (negocioId) setHistorial(await listarPublicaciones(negocioId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la publicación.');
    } finally {
      setGenerando(null);
    }
  };

  const descargar = async () => {
    if (!pub) return;
    setError(null);
    setDescargando(true);
    try {
      const uri = await shotRef.current?.capture();
      if (!uri) throw new Error('No se pudo capturar la publicación.');
      await descargarImagenDataUri(uri, `publicacion-${pub.red_social}-${pub.id.slice(0, 8)}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar. Prueba "Descargar solo la imagen IA".');
    } finally {
      setDescargando(false);
    }
  };

  const descargarSoloImagen = async () => {
    if (!pub) return;
    setDescargando(true);
    try {
      await descargarImagenDesdeUrl(pub.imagen_url, `imagen-ia-${pub.id.slice(0, 8)}.jpg`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar la imagen.');
    } finally {
      setDescargando(false);
    }
  };

  const abrirDelHistorial = (p: PublicacionMarketing) => {
    setPub(p);
    setRedSocial(p.red_social);
    setError(null);
    setPaso('resultado');
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!esPrincipal) {
    return (
      <View style={styles.center}>
        <Text style={styles.avisoNoPrincipal}>
          Automarketing es una herramienta del Operador principal de Perú. Pídele a quien administra el negocio que
          genere las publicaciones y te las comparta.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.rolTitulo}>AUTOMARKETING</Text>
      <Text style={styles.subtitulo}>
        Crea publicaciones únicas para tus redes con imagen y texto generados por IA. Sin tasas ni precios: solo
        rapidez, confianza y conexión familiar.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {paso === 'inicio' && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>1. ¿Para qué red social?</Text>
          <Text style={styles.ayuda}>Cada red usa el tamaño de imagen que le corresponde.</Text>
          <View style={styles.chipsWrap}>
            {REDES.map((r) => {
              const info = TAMANOS_RED_SOCIAL[r];
              const activo = redSocial === r;
              return (
                <Pressable key={r} style={[styles.redChip, activo && styles.redChipActivo]} onPress={() => setRedSocial(r)}>
                  <Text style={styles.redChipIcono}>{info.icono}</Text>
                  <Text style={[styles.redChipTexto, activo && styles.redChipTextoActivo]}>{info.etiqueta}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={[styles.btnPrimario, !redSocial && styles.btnDeshabilitado]} onPress={irACrear} disabled={!redSocial}>
            <Text style={styles.btnPrimarioTexto}>Crear Publicación</Text>
          </Pressable>
        </View>
      )}

      {paso === 'config' && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>Configuración (primera vez)</Text>
          <Text style={styles.ayuda}>Se guarda en tu negocio y puedes cambiarla luego desde aquí.</Text>

          <Text style={styles.label}>Nombre del negocio</Text>
          <TextInput
            style={styles.input}
            value={nombreNegocio}
            onChangeText={setNombreNegocio}
            placeholder="Remesas Perú-Venezuela"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Número de WhatsApp (con código de país)</Text>
          <TextInput
            style={styles.input}
            value={whatsappMarketing}
            onChangeText={setWhatsappMarketing}
            keyboardType="phone-pad"
            placeholder="+51 999 999 999"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Estilo visual preferido (opcional)</Text>
          <View style={styles.chipsWrap}>
            <SelectorChip texto="Sin preferencia" activo={!estiloPreferido} onPress={() => setEstiloPreferido(null)} />
            {ESTILOS.map((e) => (
              <SelectorChip key={e} texto={e} activo={estiloPreferido === e} onPress={() => setEstiloPreferido(e)} />
            ))}
          </View>

          <View style={styles.filaBotones}>
            <Pressable style={styles.btnSecundario} onPress={() => setPaso('inicio')} disabled={guardandoConfig}>
              <Text style={styles.btnSecundarioTexto}>Atrás</Text>
            </Pressable>
            <Pressable style={styles.btnPrimario} onPress={guardarConfig} disabled={guardandoConfig}>
              {guardandoConfig ? <ActivityIndicator color={colors.text} /> : <Text style={styles.btnPrimarioTexto}>Guardar y seguir</Text>}
            </Pressable>
          </View>
        </View>
      )}

      {paso === 'generar' && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>2. Ajusta el contenido (opcional)</Text>
          <Text style={styles.ayuda}>
            Deja todo en "Aleatorio" para que la IA elija entre 1 200 combinaciones. Red: {redSocial ? TAMANOS_RED_SOCIAL[redSocial].etiqueta : ''}.
          </Text>

          <Text style={styles.label}>Enfoque del texto</Text>
          <View style={styles.chipsWrap}>
            <SelectorChip texto="Aleatorio" activo={!enfoqueSel} onPress={() => setEnfoqueSel('')} />
            {ENFOQUES.map((e) => (
              <SelectorChip key={e} texto={e} activo={enfoqueSel === e} onPress={() => setEnfoqueSel(e)} />
            ))}
          </View>

          <Text style={styles.label}>Concepto de la imagen</Text>
          <View style={styles.chipsWrap}>
            <SelectorChip texto="Aleatorio" activo={!conceptoSel} onPress={() => setConceptoSel('')} />
            {CONCEPTOS.map((c) => (
              <SelectorChip key={c} texto={c} activo={conceptoSel === c} onPress={() => setConceptoSel(c)} />
            ))}
          </View>

          <View style={styles.filaBotones}>
            <Pressable style={styles.btnSecundario} onPress={() => setPaso('inicio')} disabled={generando !== null}>
              <Text style={styles.btnSecundarioTexto}>Atrás</Text>
            </Pressable>
            <Pressable style={styles.btnPrimario} onPress={() => generar()} disabled={generando !== null}>
              {generando ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.btnPrimarioTexto}>Generar Contenido</Text>
              )}
            </Pressable>
          </View>
          {generando && <Text style={styles.ayuda}>Generando imagen y texto… puede tardar entre 5 y 15 segundos.</Text>}
        </View>
      )}

      {paso === 'resultado' && pub && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>3. Tu publicación</Text>
          <Text style={styles.metaTexto}>
            {pub.red_social.toUpperCase()} · {pub.enfoque} · {pub.estilo}
          </Text>

          <ViewShot
            ref={shotRef}
            options={{ format: 'png', quality: 1, result: 'data-uri' }}
            style={styles.publicacion}
          >
            <View style={styles.pubHeader}>
              {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.pubLogo} resizeMode="cover" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.pubNegocio}>{nombreNegocio || 'Tu negocio'}</Text>
                {eslogan ? <Text style={styles.pubEslogan}>{eslogan}</Text> : null}
              </View>
            </View>

            <Image
              source={{ uri: pub.imagen_url }}
              style={[styles.pubImagen, { aspectRatio: pub.ancho / pub.alto }]}
              resizeMode="cover"
            />

            <Text style={styles.pubTextoIA}>{pub.texto}</Text>

            {pub.wa_link ? <Text style={styles.pubEnlace}>💬 Escríbenos por WhatsApp: {pub.wa_link}</Text> : null}
            {pub.invitacion_link ? <Text style={styles.pubEnlace}>🔗 Regístrate aquí: {pub.invitacion_link}</Text> : null}
          </ViewShot>

          <View style={styles.chipsWrap}>
            <Pressable
              style={styles.btnRegenerar}
              onPress={() => generar('imagen')}
              disabled={generando !== null || descargando}
            >
              <Text style={styles.btnRegenerarTexto}>{generando === 'imagen' ? 'Regenerando…' : '🔁 Regenerar imagen'}</Text>
            </Pressable>
            <Pressable
              style={styles.btnRegenerar}
              onPress={() => generar('texto')}
              disabled={generando !== null || descargando}
            >
              <Text style={styles.btnRegenerarTexto}>{generando === 'texto' ? 'Regenerando…' : '🔁 Regenerar texto'}</Text>
            </Pressable>
            <Pressable
              style={styles.btnRegenerar}
              onPress={() => generar()}
              disabled={generando !== null || descargando}
            >
              <Text style={styles.btnRegenerarTexto}>{generando === 'todo' ? 'Generando…' : '🔀 Regenerar todo'}</Text>
            </Pressable>
          </View>

          <Pressable style={styles.btnPrimario} onPress={descargar} disabled={descargando || generando !== null}>
            {descargando ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.btnPrimarioTexto}>Descargar la publicación</Text>
            )}
          </Pressable>
          <Pressable style={styles.btnSecundario} onPress={descargarSoloImagen} disabled={descargando || generando !== null}>
            <Text style={styles.btnSecundarioTexto}>Descargar solo la imagen IA</Text>
          </Pressable>
          <Pressable
            style={styles.btnSecundario}
            onPress={() => {
              setPub(null);
              setPaso('inicio');
            }}
          >
            <Text style={styles.btnSecundarioTexto}>Crear otra publicación</Text>
          </Pressable>
        </View>
      )}

      {historial.length > 0 && (
        <Collapsible titulo={`Publicaciones anteriores (${historial.length})`}>
          {historial.map((p) => (
            <Pressable key={p.id} style={styles.histFila} onPress={() => abrirDelHistorial(p)}>
              <Image source={{ uri: p.imagen_url }} style={styles.histMiniatura} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.histMeta}>
                  {p.red_social.toUpperCase()} · {FORMATTER_FECHA.format(new Date(p.created_at))}
                </Text>
                <Text style={styles.histTexto} numberOfLines={2}>
                  {p.texto}
                </Text>
              </View>
            </Pressable>
          ))}
        </Collapsible>
      )}
    </ScrollView>
  );
}

function SelectorChip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, activo && styles.chipActivo]} onPress={onPress}>
      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  avisoNoPrincipal: { color: colors.textMuted, textAlign: 'center', fontSize: 16, lineHeight: 22 },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 14, paddingBottom: 48 },
  rolTitulo: { color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  subtitulo: { color: colors.textMuted, fontSize: 15, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 10 },
  cardTitulo: { color: colors.text, fontSize: 18, fontWeight: '800' },
  ayuda: { color: colors.textMuted, fontSize: 14, lineHeight: 18 },
  metaTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '700', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    fontSize: 17,
    backgroundColor: colors.cardAlt,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.cardAlt },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextoActivo: { color: colors.text },
  redChip: {
    flexGrow: 1,
    minWidth: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    gap: 4,
  },
  redChipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  redChipIcono: { fontSize: 22 },
  redChipTexto: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  redChipTextoActivo: { color: colors.text },
  btnPrimario: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 4 },
  btnPrimarioTexto: { color: colors.text, fontWeight: '800', fontSize: 16 },
  btnDeshabilitado: { opacity: 0.4 },
  btnSecundario: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 13, alignItems: 'center' },
  btnSecundarioTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  filaBotones: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btnRegenerar: { flexGrow: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', backgroundColor: colors.cardAlt },
  btnRegenerarTexto: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  publicacion: { backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  pubHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pubLogo: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  pubNegocio: { color: colors.text, fontSize: 17, fontWeight: '800' },
  pubEslogan: { color: colors.textMuted, fontSize: 13 },
  pubImagen: { width: '100%', borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  pubTextoIA: { color: colors.text, fontSize: 15, lineHeight: 21 },
  pubEnlace: { color: colors.accent, fontSize: 12, lineHeight: 16 },
  histFila: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6 },
  histMiniatura: { width: 54, height: 54, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  histMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  histTexto: { color: colors.text, fontSize: 13, lineHeight: 17 },
});
