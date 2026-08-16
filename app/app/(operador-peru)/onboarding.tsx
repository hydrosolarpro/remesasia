import { useEffect, useState, useCallback, PropsWithChildren } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { extensionDeImagen, validarTamanoImagen, mimeDeExtension, MAX_IMAGEN_KB } from '../../lib/imagenUtil';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, radius, cardShadow } from '../../constants/theme';
import { RoleTag } from '../../components/RoleTag';

interface CuentaForm {
  id?: string;
  entidad: string;
  titular: string;
  numero_cuenta: string;
  cci: string;
}

// Onboarding del Operador Perú: primera vez que entra, y también editable
// luego desde Perfil ("Editar datos del negocio"). Todo se guarda de una
// sola vez al presionar "Guardar".
export default function OnboardingNegocio() {
  const { usuario, refreshUsuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [nombreOperador, setNombreOperador] = useState('');
  const [telefono, setTelefono] = useState('');
  const [yapeTelefono, setYapeTelefono] = useState('');
  const [plinTelefono, setPlinTelefono] = useState('');
  const [otroMedioNombre, setOtroMedioNombre] = useState('');
  const [otroMedioTelefono, setOtroMedioTelefono] = useState('');
  const [cuentas, setCuentas] = useState<CuentaForm[]>([{ entidad: '', titular: '', numero_cuenta: '', cci: '' }]);
  const [esMismoOperadorVe, setEsMismoOperadorVe] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFin, setHorarioFin] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState<null | 'logo'>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    setNombreOperador(usuario.nombre ?? '');
    setTelefono(usuario.telefono ?? '');

    const [{ data: perfil }, { data: cuentasBd }] = await Promise.all([
      supabase.from('perfil_negocio').select('*').eq('operador_peru_id', usuario.id).maybeSingle(),
      supabase.from('cuentas_bancarias_operador').select('*').eq('operador_peru_id', usuario.id),
    ]);

    if (perfil) {
      setNombreNegocio(perfil.nombre_negocio ?? '');
      setLogoUrl(perfil.logo_url);
      setYapeTelefono(perfil.yape_telefono ?? '');
      setPlinTelefono(perfil.plin_telefono ?? '');
      setOtroMedioNombre(perfil.otro_medio_nombre ?? '');
      setOtroMedioTelefono(perfil.otro_medio_telefono ?? '');
      setEsMismoOperadorVe(perfil.es_operador_venezuela_mismo);
      setHorarioInicio(perfil.horario_inicio ?? '');
      setHorarioFin(perfil.horario_fin ?? '');
    }
    if (cuentasBd && cuentasBd.length > 0) {
      setCuentas(
        cuentasBd.map((c) => ({ id: c.id, entidad: c.entidad, titular: c.titular ?? '', numero_cuenta: c.numero_cuenta, cci: c.cci ?? '' }))
      );
    }
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subirImagen = async (tipo: 'logo') => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (resultado.canceled || !usuario) return;
    if (!(await validarTamanoImagen(resultado.assets[0]))) {
      Alert.alert('Imagen muy pesada', `La imagen supera el límite de ${MAX_IMAGEN_KB} KB. Elige una más liviana.`);
      return;
    }

    setSubiendoImagen(tipo);
    const archivo = resultado.assets[0];
    const ext = extensionDeImagen(archivo);
    const path = `negocio/${usuario.id}/${tipo}.${ext}`;
    // arrayBuffer() en vez de blob(): en React Native fetch(...).blob() de
    // un archivo local es muy lento (ver lib/imagenUtil.ts).
    const arrayBuffer = await (await fetch(archivo.uri)).arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(path, arrayBuffer, { upsert: true, contentType: mimeDeExtension(ext) });
    setSubiendoImagen(null);
    if (uploadError) {
      Alert.alert('Error al subir imagen', uploadError.message);
      return;
    }
    const { data } = supabase.storage.from('comprobantes').getPublicUrl(path);
    const urlConCacheBust = `${data.publicUrl}?t=${Date.now()}`;
    setLogoUrl(urlConCacheBust);
  };

  const agregarCuenta = () => setCuentas((prev) => [...prev, { entidad: '', titular: '', numero_cuenta: '', cci: '' }]);
  const quitarCuenta = (idx: number) => setCuentas((prev) => prev.filter((_, i) => i !== idx));
  const editarCuenta = (idx: number, campo: keyof CuentaForm, valor: string) =>
    setCuentas((prev) => prev.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c)));

  const guardar = async () => {
    if (!usuario) return;
    setError(null);

    if (!nombreNegocio.trim() || !nombreOperador.trim() || !telefono.trim()) {
      setError('Completa nombre del negocio, nombre del operador y teléfono.');
      return;
    }
    const cuentasValidas = cuentas.filter((c) => c.entidad.trim() && c.numero_cuenta.trim());
    if (cuentasValidas.length === 0) {
      setError('Agrega al menos una cuenta bancaria.');
      return;
    }

    setGuardando(true);
    try {
      await supabase.from('usuarios').update({ nombre: nombreOperador.trim(), telefono: telefono.trim() }).eq('id', usuario.id);

      const { error: perfilError } = await supabase.from('perfil_negocio').upsert(
        {
          operador_peru_id: usuario.id,
          nombre_negocio: nombreNegocio.trim(),
          logo_url: logoUrl,
          yape_telefono: yapeTelefono.trim() || null,
          plin_telefono: plinTelefono.trim() || null,
          otro_medio_nombre: otroMedioNombre.trim() || null,
          otro_medio_telefono: otroMedioTelefono.trim() || null,
          es_operador_venezuela_mismo: esMismoOperadorVe,
          horario_inicio: horarioInicio.trim(),
          horario_fin: horarioFin.trim(),
        },
        { onConflict: 'operador_peru_id' }
      );
      if (perfilError) throw perfilError;

      await supabase.from('cuentas_bancarias_operador').delete().eq('operador_peru_id', usuario.id);
      const { error: cuentasError } = await supabase.from('cuentas_bancarias_operador').insert(
        cuentasValidas.map((c) => ({
          operador_peru_id: usuario.id,
          entidad: c.entidad.trim(),
          titular: c.titular.trim(),
          numero_cuenta: c.numero_cuenta.trim(),
          cci: c.cci.trim(),
        }))
      );
      if (cuentasError) throw cuentasError;

      await refreshUsuario();
      router.replace('/(operador-peru)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
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
      <RoleTag rol="operador_peru" />
      <Text style={styles.titulo}>Datos de tu negocio</Text>
      <Text style={styles.subtitulo}>Se guardan una vez y puedes editarlos cuando quieras.</Text>

      <Section titulo="Negocio">
        <Label texto="Nombre del negocio" />
        <TextInput style={styles.input} value={nombreNegocio} onChangeText={setNombreNegocio} placeholder="Remesas Perú-Venezuela" placeholderTextColor={colors.textMuted} />

        <Label texto="Logo" />
        <LogoPicker uri={logoUrl} subiendo={subiendoImagen === 'logo'} onPress={() => subirImagen('logo')} />
      </Section>

      <Section titulo="Tus datos">
        <Label texto="Nombre completo" />
        <TextInput style={styles.input} value={nombreOperador} onChangeText={setNombreOperador} placeholderTextColor={colors.textMuted} />

        <Label texto="Teléfono" />
        <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" placeholder="+51 999 999 999" placeholderTextColor={colors.textMuted} />

        <Label texto="Correo" />
        <View style={[styles.input, styles.inputDisabled]}>
          <Text style={styles.inputDisabledText}>{usuario?.email}</Text>
        </View>
      </Section>

      <Section titulo="Datos de teléfonos para plataformas de pago de banca móvil (Yape/Plin/otros)">
        <Text style={styles.ayuda}>El cliente verá este número para pagarte por Yape o Plin, con opción de copiarlo.</Text>
        <Label texto="Teléfono Yape" />
        <TextInput
          style={styles.input}
          value={yapeTelefono}
          onChangeText={setYapeTelefono}
          keyboardType="phone-pad"
          placeholder="+51 999 999 999"
          placeholderTextColor={colors.textMuted}
        />
        <Label texto="Teléfono Plin" />
        <TextInput
          style={styles.input}
          value={plinTelefono}
          onChangeText={setPlinTelefono}
          keyboardType="phone-pad"
          placeholder="+51 999 999 999"
          placeholderTextColor={colors.textMuted}
        />

        <Label texto="Otro medio de pago (opcional)" />
        <View style={styles.cuentaRow}>
          <TextInput
            style={[styles.input, styles.cuentaEntidad]}
            value={otroMedioNombre}
            onChangeText={setOtroMedioNombre}
            placeholder="Nombre (Ej. Tunki, Agora...)"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.cuentaNumero]}
            value={otroMedioTelefono}
            onChangeText={setOtroMedioTelefono}
            keyboardType="phone-pad"
            placeholder="Teléfono"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </Section>

      <Section titulo="Cuentas bancarias">
        {cuentas.map((cuenta, idx) => (
          <View key={cuenta.id ?? idx} style={styles.cuentaBloque}>
            <View style={styles.cuentaRow}>
              <TextInput
                style={[styles.input, styles.cuentaEntidad]}
                value={cuenta.entidad}
                onChangeText={(v) => editarCuenta(idx, 'entidad', v)}
                placeholder="Entidad (BCP, Interbank...)"
                placeholderTextColor={colors.textMuted}
              />
              {cuentas.length > 1 && (
                <Pressable onPress={() => quitarCuenta(idx)} style={styles.quitarBtn}>
                  <Text style={styles.quitarBtnTexto}>✕</Text>
                </Pressable>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={cuenta.titular}
              onChangeText={(v) => editarCuenta(idx, 'titular', v)}
              placeholder="Titular de la cuenta"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.cuentaRow}>
              <TextInput
                style={[styles.input, styles.cuentaNumero]}
                value={cuenta.numero_cuenta}
                onChangeText={(v) => editarCuenta(idx, 'numero_cuenta', v)}
                placeholder="N° de cuenta"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, styles.cuentaNumero]}
                value={cuenta.cci}
                onChangeText={(v) => editarCuenta(idx, 'cci', v)}
                placeholder="CCI"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        ))}
        <Pressable style={styles.agregarBtn} onPress={agregarCuenta}>
          <Text style={styles.agregarBtnTexto}>+ Agregar cuenta</Text>
        </Pressable>
      </Section>

      <Section titulo="Horario de atención">
        <View style={styles.horarioRow}>
          <View style={{ flex: 1 }}>
            <Label texto="Hora de inicio" />
            <TextInput
              style={styles.input}
              value={horarioInicio}
              onChangeText={setHorarioInicio}
              placeholder="08:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label texto="Hora final" />
            <TextInput
              style={styles.input}
              value={horarioFin}
              onChangeText={setHorarioFin}
              placeholder="20:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      </Section>

      <Section titulo="Operador Venezuela">
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Yo cumplo también esa función</Text>
          <Switch
            value={esMismoOperadorVe}
            onValueChange={setEsMismoOperadorVe}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>

        {!esMismoOperadorVe && (
          <Text style={styles.ayuda}>
            Para agregar a las personas de tu equipo en Venezuela (o en Perú), ve a la pestaña Perfil.
          </Text>
        )}
      </Section>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.guardarBtn} onPress={guardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.guardarBtnTexto}>Guardar datos</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Section({ titulo, children }: PropsWithChildren<{ titulo: string }>) {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.sectionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Label({ texto }: { texto: string }) {
  return <Text style={styles.label}>{texto}</Text>;
}

function LogoPicker({ uri, subiendo, onPress }: { uri: string | null; subiendo: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.logoPicker} onPress={onPress} disabled={subiendo}>
      {subiendo ? (
        <ActivityIndicator color={colors.primary} />
      ) : uri ? (
        <Image source={{ uri }} style={styles.logoImg} resizeMode="cover" />
      ) : (
        <Text style={styles.logoPlaceholder}>Subir logo</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 16, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 25, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 15, marginTop: -8 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4 },
  sectionTitulo: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 10 },
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
  logoPicker: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  logoPlaceholder: { color: colors.accent, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 },
  cuentaBloque: { gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cuentaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  // minWidth: 0 es necesario porque en web un input dentro de un flex
  // container no se encoge por debajo de su ancho de contenido por
  // defecto -- sin esto, un CCI largo (20 dígitos) empujaba el campo
  // fuera del margen visible en pantallas de celular.
  cuentaEntidad: { flex: 1, minWidth: 0, marginTop: 0 },
  cuentaNumero: { flex: 1, minWidth: 0, marginTop: 0 },
  quitarBtn: { padding: 8 },
  quitarBtnTexto: { color: colors.danger, fontSize: 18, fontWeight: '800' },
  agregarBtn: { marginTop: 12, alignSelf: 'flex-start' },
  agregarBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  switchLabel: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  horarioRow: { flexDirection: 'row', gap: 12 },
  ayuda: { color: colors.textMuted, fontSize: 14, lineHeight: 17, marginTop: 12 },
  copiarEnlaceBtn: { backgroundColor: colors.cardAlt, borderRadius: radius.sm, padding: 12, alignItems: 'center', marginTop: 8 },
  copiarEnlaceBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, fontSize: 15 },
  guardarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 4 },
  guardarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 18 },
});
