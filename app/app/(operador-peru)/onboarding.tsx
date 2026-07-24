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
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { colors, radius, cardShadow } from '../../constants/theme';

interface CuentaForm {
  id?: string;
  entidad: string;
  numero_cuenta: string;
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
  const [yapeQrUrl, setYapeQrUrl] = useState<string | null>(null);
  const [plinQrUrl, setPlinQrUrl] = useState<string | null>(null);
  const [cuentas, setCuentas] = useState<CuentaForm[]>([{ entidad: '', numero_cuenta: '' }]);
  const [esMismoOperadorVe, setEsMismoOperadorVe] = useState(false);
  const [veNombre, setVeNombre] = useState('');
  const [veTelefono, setVeTelefono] = useState('');
  const [veEmail, setVeEmail] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState<null | 'logo' | 'yape' | 'plin'>(null);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    setNombreOperador(usuario.nombre ?? '');
    setTelefono(usuario.telefono ?? '');

    const [{ data: perfil }, { data: cuentasBd }, { data: vePerfil }] = await Promise.all([
      supabase.from('perfil_negocio').select('*').eq('operador_peru_id', usuario.id).maybeSingle(),
      supabase.from('cuentas_bancarias_operador').select('*').eq('operador_peru_id', usuario.id),
      supabase.from('operador_venezuela_perfil').select('*').eq('operador_peru_id', usuario.id).maybeSingle(),
    ]);

    if (perfil) {
      setNombreNegocio(perfil.nombre_negocio ?? '');
      setLogoUrl(perfil.logo_url);
      setYapeQrUrl(perfil.yape_qr_url);
      setPlinQrUrl(perfil.plin_qr_url);
      setEsMismoOperadorVe(perfil.es_operador_venezuela_mismo);
    }
    if (cuentasBd && cuentasBd.length > 0) {
      setCuentas(cuentasBd.map((c) => ({ id: c.id, entidad: c.entidad, numero_cuenta: c.numero_cuenta })));
    }
    if (vePerfil) {
      setVeNombre(vePerfil.nombre ?? '');
      setVeTelefono(vePerfil.telefono ?? '');
      setVeEmail(vePerfil.email ?? '');
    }
    setCargando(false);
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subirImagen = async (tipo: 'logo' | 'yape' | 'plin') => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (resultado.canceled || !usuario) return;

    setSubiendoImagen(tipo);
    const archivo = resultado.assets[0];
    const ext = archivo.uri.split('.').pop() ?? 'jpg';
    const path = `negocio/${usuario.id}/${tipo}.${ext}`;
    const respuesta = await fetch(archivo.uri);
    const blob = await respuesta.blob();

    const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
    setSubiendoImagen(null);
    if (uploadError) {
      Alert.alert('Error al subir imagen', uploadError.message);
      return;
    }
    const { data } = supabase.storage.from('comprobantes').getPublicUrl(path);
    const urlConCacheBust = `${data.publicUrl}?t=${Date.now()}`;
    if (tipo === 'logo') setLogoUrl(urlConCacheBust);
    if (tipo === 'yape') setYapeQrUrl(urlConCacheBust);
    if (tipo === 'plin') setPlinQrUrl(urlConCacheBust);
  };

  const agregarCuenta = () => setCuentas((prev) => [...prev, { entidad: '', numero_cuenta: '' }]);
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
    if (!esMismoOperadorVe && (!veNombre.trim() || !veEmail.trim())) {
      setError('Completa el nombre y email del operador Venezuela, o marca "Soy el mismo".');
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
          yape_qr_url: yapeQrUrl,
          plin_qr_url: plinQrUrl,
          es_operador_venezuela_mismo: esMismoOperadorVe,
        },
        { onConflict: 'operador_peru_id' }
      );
      if (perfilError) throw perfilError;

      await supabase.from('cuentas_bancarias_operador').delete().eq('operador_peru_id', usuario.id);
      const { error: cuentasError } = await supabase.from('cuentas_bancarias_operador').insert(
        cuentasValidas.map((c) => ({
          operador_peru_id: usuario.id,
          entidad: c.entidad.trim(),
          numero_cuenta: c.numero_cuenta.trim(),
        }))
      );
      if (cuentasError) throw cuentasError;

      if (esMismoOperadorVe) {
        await supabase.from('operador_venezuela_perfil').delete().eq('operador_peru_id', usuario.id);
      } else {
        const { error: veError } = await supabase.from('operador_venezuela_perfil').upsert(
          {
            operador_peru_id: usuario.id,
            nombre: veNombre.trim(),
            telefono: veTelefono.trim() || null,
            email: veEmail.trim().toLowerCase(),
          },
          { onConflict: 'operador_peru_id' }
        );
        if (veError) throw veError;
      }

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

      <Section titulo="QR de pago">
        <View style={styles.qrRow}>
          <View style={styles.qrCol}>
            <Label texto="Yape" />
            <QrPicker uri={yapeQrUrl} subiendo={subiendoImagen === 'yape'} onPress={() => subirImagen('yape')} />
          </View>
          <View style={styles.qrCol}>
            <Label texto="Plin" />
            <QrPicker uri={plinQrUrl} subiendo={subiendoImagen === 'plin'} onPress={() => subirImagen('plin')} />
          </View>
        </View>
      </Section>

      <Section titulo="Cuentas bancarias">
        {cuentas.map((cuenta, idx) => (
          <View key={cuenta.id ?? idx} style={styles.cuentaRow}>
            <TextInput
              style={[styles.input, styles.cuentaEntidad]}
              value={cuenta.entidad}
              onChangeText={(v) => editarCuenta(idx, 'entidad', v)}
              placeholder="Entidad (BCP, Interbank...)"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, styles.cuentaNumero]}
              value={cuenta.numero_cuenta}
              onChangeText={(v) => editarCuenta(idx, 'numero_cuenta', v)}
              placeholder="N° de cuenta"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            {cuentas.length > 1 && (
              <Pressable onPress={() => quitarCuenta(idx)} style={styles.quitarBtn}>
                <Text style={styles.quitarBtnTexto}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Pressable style={styles.agregarBtn} onPress={agregarCuenta}>
          <Text style={styles.agregarBtnTexto}>+ Agregar cuenta</Text>
        </Pressable>
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
          <>
            <Label texto="Nombre completo" />
            <TextInput style={styles.input} value={veNombre} onChangeText={setVeNombre} placeholderTextColor={colors.textMuted} />
            <Label texto="Teléfono" />
            <TextInput style={styles.input} value={veTelefono} onChangeText={setVeTelefono} keyboardType="phone-pad" placeholder="+58 999 999 999" placeholderTextColor={colors.textMuted} />
            <Label texto="Correo Gmail (con ese correo debe iniciar sesión)" />
            <TextInput
              style={styles.input}
              value={veEmail}
              onChangeText={setVeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="operador.venezuela@gmail.com"
              placeholderTextColor={colors.textMuted}
            />
          </>
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

function QrPicker({ uri, subiendo, onPress }: { uri: string | null; subiendo: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.qrPicker} onPress={onPress} disabled={subiendo}>
      {subiendo ? (
        <ActivityIndicator color={colors.primary} />
      ) : uri ? (
        <Image source={{ uri }} style={styles.qrImg} resizeMode="contain" />
      ) : (
        <Text style={styles.qrPlaceholder}>Subir QR</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 16, paddingBottom: 48 },
  titulo: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitulo: { color: colors.textMuted, fontSize: 13, marginTop: -8 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 4 },
  sectionTitulo: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 10 },
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
  inputDisabled: { justifyContent: 'center', opacity: 0.7 },
  inputDisabledText: { color: colors.textMuted, fontSize: 15 },
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
  logoPlaceholder: { color: colors.accent, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 },
  qrRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  qrCol: { flex: 1 },
  qrPicker: {
    width: '100%',
    aspectRatio: 1,
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
  qrImg: { width: '100%', height: '100%' },
  qrPlaceholder: { color: colors.accent, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 },
  cuentaRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  cuentaEntidad: { flex: 1.2, marginTop: 0 },
  cuentaNumero: { flex: 1, marginTop: 0 },
  quitarBtn: { padding: 8 },
  quitarBtnTexto: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  agregarBtn: { marginTop: 12, alignSelf: 'flex-start' },
  agregarBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  switchLabel: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  error: { color: colors.danger, fontSize: 13 },
  guardarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center', marginTop: 4 },
  guardarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
