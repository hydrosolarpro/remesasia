import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { calcularConversion } from '../../lib/tasaCalculo';
import { obtenerTasaBcv } from '../../lib/bcv';
import { CopyField } from '../../components/CopyField';
import { LiveClock } from '../../components/LiveClock';
import { RoleTag } from '../../components/RoleTag';
import {
  Tasa,
  TasaBcv,
  PerfilNegocio,
  CuentaBancariaOperador,
  CuentaUtilizadaCliente,
  MetodoPago,
} from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';

export default function InicioCliente() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [tasa, setTasa] = useState<Tasa | null>(null);
  const [bcv, setBcv] = useState<TasaBcv | null>(null);
  const [bcvCargando, setBcvCargando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilNegocio | null>(null);
  const [nombreOperador, setNombreOperador] = useState('');
  const [cuentasOperador, setCuentasOperador] = useState<CuentaBancariaOperador[]>([]);
  const [cuentasGuardadas, setCuentasGuardadas] = useState<CuentaUtilizadaCliente[]>([]);

  const [montoPen, setMontoPen] = useState('');
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string | null>(null);
  const [beneficiarioNombre, setBeneficiarioNombre] = useState('');
  const [beneficiarioTelefono, setBeneficiarioTelefono] = useState('');
  const [beneficiarioCi, setBeneficiarioCi] = useState('');
  const [beneficiarioBanco, setBeneficiarioBanco] = useState('');
  const [beneficiarioCuenta, setBeneficiarioCuenta] = useState('');
  const [guardarCuenta, setGuardarCuenta] = useState(true);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('yape');
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const negocioId = usuario?.negocio_operador_peru_id ?? null;

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);

    if (!negocioId) {
      setCargando(false);
      return;
    }

    const { data: operadorRow } = await supabase.from('usuarios').select('id, nombre').eq('id', negocioId).maybeSingle();

    const [{ data: tasaData }, { data: perfilData }, { data: cuentasData }, { data: guardadasData }] = await Promise.all([
      supabase
        .from('tasas')
        .select('*')
        .eq('publicada_por', negocioId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('perfil_negocio').select('*').eq('operador_peru_id', negocioId).maybeSingle(),
      supabase.from('cuentas_bancarias_operador').select('*').eq('operador_peru_id', negocioId),
      supabase.from('cuentas_utilizadas_cliente').select('*').eq('cliente_id', usuario.id).order('created_at', { ascending: false }),
    ]);

    setNombreOperador(operadorRow?.nombre ?? '');
    setTasa(tasaData as Tasa | null);
    setPerfil(perfilData as PerfilNegocio | null);
    setCuentasOperador((cuentasData as CuentaBancariaOperador[] | null) ?? []);
    setCuentasGuardadas((guardadasData as CuentaUtilizadaCliente[] | null) ?? []);
    setCargando(false);
  }, [usuario, negocioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setBcvCargando(true);
    obtenerTasaBcv()
      .then(setBcv)
      .catch(() => setBcv(null))
      .finally(() => setBcvCargando(false));
  }, []);

  const conversion = useMemo(() => {
    const monto = Number(montoPen.replace(',', '.'));
    if (!tasa || !Number.isFinite(monto) || monto <= 0) return null;
    return calcularConversion(monto, tasa.tasa_pen_usdt, tasa.tasa_usdt_ves);
  }, [montoPen, tasa]);

  const equivalenteUsd = conversion && bcv ? conversion.montoVes / bcv.usd_ves : null;
  const equivalenteEur = conversion && bcv ? conversion.montoVes / bcv.eur_ves : null;

  const elegirCuentaGuardada = (cuenta: CuentaUtilizadaCliente) => {
    setCuentaSeleccionadaId(cuenta.id);
    setBeneficiarioNombre(cuenta.nombre_beneficiario);
    setBeneficiarioTelefono(cuenta.telefono ?? '');
    setBeneficiarioCi(cuenta.ci);
    setBeneficiarioBanco(cuenta.entidad_bancaria);
    setBeneficiarioCuenta(cuenta.numero_cuenta);
  };

  const limpiarBeneficiario = () => {
    setCuentaSeleccionadaId(null);
    setBeneficiarioNombre('');
    setBeneficiarioTelefono('');
    setBeneficiarioCi('');
    setBeneficiarioBanco('');
    setBeneficiarioCuenta('');
  };

  const elegirComprobante = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Habilita el acceso a tus fotos.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!resultado.canceled) setComprobanteUri(resultado.assets[0].uri);
  };

  const enviarSolicitud = async () => {
    setError(null);
    if (!usuario || !negocioId || !tasa || !conversion) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (!beneficiarioNombre.trim() || !beneficiarioCi.trim() || !beneficiarioBanco.trim() || !beneficiarioCuenta.trim()) {
      setError('Completa los datos del beneficiario en Venezuela.');
      return;
    }
    if (!comprobanteUri) {
      setError('Sube la imagen de tu depósito.');
      return;
    }

    setEnviando(true);
    try {
      const { data: solicitud, error: insertError } = await supabase
        .from('solicitudes')
        .insert({
          cliente_id: usuario.id,
          negocio_operador_peru_id: negocioId,
          estado: 'EN_VERIFICACION',
          monto_pen: conversion.montoPen,
          tasa_pen_usdt: conversion.tasaPenUsdt,
          tasa_usdt_ves: conversion.tasaUsdtVes,
          monto_usdt: conversion.montoUsdt,
          monto_ves: conversion.montoVes,
          beneficiario_nombre: beneficiarioNombre.trim(),
          beneficiario_banco: beneficiarioBanco.trim(),
          beneficiario_cuenta: beneficiarioCuenta.trim(),
          beneficiario_ci: beneficiarioCi.trim(),
          beneficiario_telefono: beneficiarioTelefono.trim() || null,
          metodo_pago: metodoPago,
        })
        .select()
        .single();
      if (insertError || !solicitud) throw insertError ?? new Error('No se pudo crear la solicitud.');

      const ext = comprobanteUri.split('.').pop() ?? 'jpg';
      const path = `${solicitud.id}/comprobante-cliente.${ext}`;
      const blob = await (await fetch(comprobanteUri)).blob();
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);
      await supabase.from('solicitudes').update({ comprobante_pago_url: publicUrl.publicUrl }).eq('id', solicitud.id);

      if (guardarCuenta) {
        await supabase.from('cuentas_utilizadas_cliente').upsert(
          {
            cliente_id: usuario.id,
            nombre_beneficiario: beneficiarioNombre.trim(),
            telefono: beneficiarioTelefono.trim() || null,
            ci: beneficiarioCi.trim(),
            entidad_bancaria: beneficiarioBanco.trim(),
            numero_cuenta: beneficiarioCuenta.trim(),
          },
          { onConflict: 'cliente_id,ci,numero_cuenta' }
        );
      }

      setMontoPen('');
      limpiarBeneficiario();
      setComprobanteUri(null);
      router.push({ pathname: '/(cliente)/solicitud/[id]', params: { id: solicitud.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!negocioId) {
    return (
      <View style={styles.center}>
        <RoleTag rol="cliente" />
        <Text style={styles.avisoSinNegocio}>
          Tu cuenta todavía no está vinculada a ningún negocio. Pide al operador que te comparta su enlace de invitación por
          WhatsApp para poder usar la app.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol="cliente" />
      <Text style={styles.bienvenida}>Hola, {usuario?.nombre}</Text>
      <LiveClock />
      {!!perfil?.eslogan && <Text style={styles.eslogan}>&quot;{perfil.eslogan}&quot;</Text>}

      <View style={styles.filaTasas}>
        <View style={[styles.card, cardShadow, styles.tasaCard]}>
          <Text style={styles.tasaLabel}>Tasa del día</Text>
          <Text style={styles.tasaValor}>{tasa ? `S/ ${tasa.tasa_pen_usdt}` : '—'}</Text>
        </View>
        <View style={[styles.card, cardShadow, styles.tasaCard]}>
          <Text style={styles.tasaLabel}>BCV — USD / EUR</Text>
          {bcvCargando ? (
            <ActivityIndicator color={colors.primary} />
          ) : bcv ? (
            <>
              <Text style={styles.bcvValor}>${bcv.usd_ves.toFixed(2)} Bs</Text>
              <Text style={styles.bcvValor}>€{bcv.eur_ves.toFixed(2)} Bs</Text>
            </>
          ) : (
            <Text style={styles.bcvValor}>No disponible</Text>
          )}
        </View>
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Calculadora</Text>
        <TextInput
          style={styles.montoInput}
          value={montoPen}
          onChangeText={setMontoPen}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.montoLabel}>Soles a enviar</Text>

        {conversion && (
          <View style={styles.resultado}>
            <Text style={styles.resultadoBs}>Bs {conversion.montoVes.toFixed(2)}</Text>
            {bcv && (
              <Text style={styles.resultadoEquivalente}>
                ≈ ${equivalenteUsd!.toFixed(2)} · €{equivalenteEur!.toFixed(2)}
              </Text>
            )}
          </View>
        )}
      </View>

      {conversion && (
        <>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.seccionTitulo}>¿Quién recibe en Venezuela?</Text>

            {cuentasGuardadas.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {cuentasGuardadas.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, cuentaSeleccionadaId === c.id && styles.chipActivo]}
                    onPress={() => elegirCuentaGuardada(c)}
                  >
                    <Text style={[styles.chipTexto, cuentaSeleccionadaId === c.id && styles.chipTextoActivo]} numberOfLines={1}>
                      {c.nombre_beneficiario}
                    </Text>
                  </Pressable>
                ))}
                <Pressable style={styles.chip} onPress={limpiarBeneficiario}>
                  <Text style={styles.chipTexto}>+ Nuevo</Text>
                </Pressable>
              </ScrollView>
            )}

            <Field label="Nombre completo" value={beneficiarioNombre} onChangeText={setBeneficiarioNombre} />
            <Field label="Teléfono" value={beneficiarioTelefono} onChangeText={setBeneficiarioTelefono} keyboardType="phone-pad" />
            <Field label="Cédula (C.I.)" value={beneficiarioCi} onChangeText={setBeneficiarioCi} />
            <Field label="Entidad bancaria" value={beneficiarioBanco} onChangeText={setBeneficiarioBanco} />
            <Field label="N° de cuenta" value={beneficiarioCuenta} onChangeText={setBeneficiarioCuenta} keyboardType="numeric" />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Guardar estos datos para la próxima vez</Text>
              <Switch
                value={guardarCuenta}
                onValueChange={setGuardarCuenta}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.text}
              />
            </View>
          </View>

          <View style={[styles.card, cardShadow]}>
            <Text style={styles.seccionTitulo}>Datos para pagar en Perú</Text>
            <Text style={styles.pagarA}>{nombreOperador}</Text>

            <View style={styles.qrRow}>
              {perfil?.yape_qr_url && (
                <View style={styles.qrCol}>
                  <Text style={styles.qrLabel}>Yape</Text>
                  <Image source={{ uri: perfil.yape_qr_url }} style={styles.qrImg} resizeMode="contain" />
                </View>
              )}
              {perfil?.plin_qr_url && (
                <View style={styles.qrCol}>
                  <Text style={styles.qrLabel}>Plin</Text>
                  <Image source={{ uri: perfil.plin_qr_url }} style={styles.qrImg} resizeMode="contain" />
                </View>
              )}
            </View>

            {cuentasOperador.map((c) => (
              <CopyField key={c.id} label={c.entidad} value={c.numero_cuenta} />
            ))}

            <Text style={styles.label}>Método de pago usado</Text>
            <View style={styles.metodoRow}>
              {(['yape', 'banco'] as MetodoPago[]).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.metodoOption, metodoPago === m && styles.metodoOptionActive]}
                  onPress={() => setMetodoPago(m)}
                >
                  <Text style={[styles.metodoText, metodoPago === m && styles.metodoTextActive]}>
                    {m === 'yape' ? 'Yape / Plin' : 'Transferencia bancaria'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.seccionTitulo}>Comprobante de tu depósito</Text>
            <Pressable style={styles.subirBtn} onPress={elegirComprobante}>
              {comprobanteUri ? (
                <Image source={{ uri: comprobanteUri }} style={styles.comprobantePreview} resizeMode="cover" />
              ) : (
                <Text style={styles.subirBtnTexto}>Elegir captura del depósito</Text>
              )}
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.enviarBtn} onPress={enviarSolicitud} disabled={enviando}>
            {enviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.enviarBtnTexto}>Enviar solicitud</Text>}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  avisoSinNegocio: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  bienvenida: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: -4 },
  eslogan: { color: colors.accent, fontSize: 13, fontStyle: 'italic', fontWeight: '600' },
  filaTasas: { flexDirection: 'row', gap: 12 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  tasaCard: { flex: 1, gap: 4 },
  tasaLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  tasaValor: { color: colors.text, fontSize: 22, fontWeight: '900' },
  bcvValor: { color: colors.text, fontSize: 15, fontWeight: '700' },
  seccionTitulo: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  montoInput: { color: colors.text, fontSize: 36, fontWeight: '900' },
  montoLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  resultado: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  resultadoBs: { color: colors.accent, fontSize: 26, fontWeight: '900' },
  resultadoEquivalente: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  chipsScroll: { marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 160,
  },
  chipActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  chipTexto: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  chipTextoActivo: { color: colors.text },
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  switchLabel: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  pagarA: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  qrRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  qrCol: { flex: 1, alignItems: 'center' },
  qrLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  qrImg: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  metodoRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  metodoOption: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  metodoOptionActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  metodoText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  metodoTextActive: { color: colors.text },
  subirBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
    overflow: 'hidden',
  },
  subirBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  comprobantePreview: { width: '100%', height: 160, borderRadius: radius.sm },
  error: { color: colors.danger, fontSize: 13 },
  enviarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  enviarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
