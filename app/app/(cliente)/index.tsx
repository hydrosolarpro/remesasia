import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { extensionDeImagen, validarTamanoImagen, mimeDeExtension, MAX_IMAGEN_KB } from '../../lib/imagenUtil';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { calcularConversion, calcularConversionInversa, divisaAVes } from '../../lib/tasaCalculo';
import { obtenerTasaBcv } from '../../lib/bcv';
import { formatearBs } from '../../lib/formato';
import { CopyField } from '../../components/CopyField';
import { LiveClock } from '../../components/LiveClock';
import { RoleTag } from '../../components/RoleTag';
import { MensajeModal } from '../../components/MensajeModal';
import { ZoomableImageModal } from '../../components/ZoomableImageModal';
import {
  Tasa,
  TasaBcv,
  PerfilNegocio,
  CuentaBancariaOperador,
  BeneficiarioCliente,
  BeneficiarioCuentaBancaria,
  MetodoPago,
} from '../../types/database';

type BeneficiarioConCuentas = BeneficiarioCliente & { cuentas: BeneficiarioCuentaBancaria[] };
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
  const [beneficiariosGuardados, setBeneficiariosGuardados] = useState<BeneficiarioConCuentas[]>([]);

  const [montoPen, setMontoPen] = useState('');
  // Convertidor de Divisas (antes una pestaña independiente, ahora una
  // etapa previa de Nueva Solicitud): solo guarda lo que el usuario tipeó
  // en USD/EUR -- el resultado en Soles se escribe directo en `montoPen`,
  // el mismo estado que ya usan el resto de procesos de esta pantalla.
  const [monedaConvertidor, setMonedaConvertidor] = useState<'usd' | 'eur'>('usd');
  const [montoConvertidor, setMontoConvertidor] = useState('');
  const [beneficiarioSeleccionadoId, setBeneficiarioSeleccionadoId] = useState<string | null>(null);
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string | null>(null);
  const [beneficiarioNombre, setBeneficiarioNombre] = useState('');
  const [beneficiarioTelefono, setBeneficiarioTelefono] = useState('');
  const [beneficiarioCi, setBeneficiarioCi] = useState('');
  const [beneficiarioBanco, setBeneficiarioBanco] = useState('');
  const [tipoTransferencia, setTipoTransferencia] = useState<'transferencia_bancaria' | 'pago_movil'>('transferencia_bancaria');
  const [beneficiarioCuenta, setBeneficiarioCuenta] = useState('');
  const [guardarCuenta, setGuardarCuenta] = useState(true);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('yape');
  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [comprobanteExt, setComprobanteExt] = useState('jpg');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarExito, setMostrarExito] = useState(false);
  const [mostrarZoomComprobante, setMostrarZoomComprobante] = useState(false);
  // Guarda sincrónica contra doble envío: `enviando` (estado de React) no
  // alcanza a re-renderizar el botón a tiempo si el usuario vuelve a tocar
  // "Enviar solicitud" muy rápido (p.ej. mientras la subida del
  // comprobante tarda) -- eso generaba solicitudes duplicadas.
  const enviandoRef = useRef(false);

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
      supabase
        .from('beneficiarios_cliente')
        .select('*, cuentas:beneficiario_cuentas_bancarias(*)')
        .eq('cliente_id', usuario.id)
        .order('created_at', { ascending: false }),
    ]);

    setNombreOperador(operadorRow?.nombre ?? '');
    setTasa(tasaData as Tasa | null);
    setPerfil(perfilData as PerfilNegocio | null);
    setCuentasOperador((cuentasData as CuentaBancariaOperador[] | null) ?? []);
    setBeneficiariosGuardados((guardadasData as BeneficiarioConCuentas[] | null) ?? []);
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
    return calcularConversion(monto, tasa.tasa_pen_ves);
  }, [montoPen, tasa]);

  const equivalenteUsd = conversion && bcv ? conversion.montoVes / bcv.usd_ves : null;
  const equivalenteEur = conversion && bcv ? conversion.montoVes / bcv.eur_ves : null;

  const xVesConvertidor = bcv ? (monedaConvertidor === 'usd' ? bcv.usd_ves : bcv.eur_ves) : null;
  const conversionDivisaPen = useMemo(() => {
    const montoDivisa = Number(montoConvertidor.replace(',', '.'));
    if (!tasa || !xVesConvertidor || !Number.isFinite(montoDivisa) || montoDivisa <= 0) return null;
    const ves = divisaAVes(montoDivisa, xVesConvertidor);
    return calcularConversionInversa(ves, tasa.tasa_pen_ves);
  }, [montoConvertidor, tasa, xVesConvertidor]);

  // Al convertir USD/EUR el resultado en Soles se carga automáticamente en
  // Nueva Solicitud -- sin esto el usuario tendría que volver a tipear el
  // monto ya convertido en el campo de arriba.
  useEffect(() => {
    if (conversionDivisaPen !== null) setMontoPen(String(conversionDivisaPen));
  }, [conversionDivisaPen]);

  // Elegir beneficiario: si tiene una sola cuenta, se autocompleta todo de
  // una vez; si tiene varias, el cliente elige la cuenta específica en el
  // segundo selector que aparece debajo (ver JSX).
  const elegirBeneficiario = (b: BeneficiarioConCuentas) => {
    setBeneficiarioSeleccionadoId(b.id);
    setBeneficiarioNombre(b.nombre);
    setBeneficiarioCi(b.ci);
    if (b.cuentas.length === 1) {
      elegirCuentaGuardada(b.cuentas[0]);
    } else {
      setCuentaSeleccionadaId(null);
      setBeneficiarioTelefono('');
      setBeneficiarioBanco('');
      setBeneficiarioCuenta('');
    }
  };

  const elegirCuentaGuardada = (cuenta: BeneficiarioCuentaBancaria) => {
    setCuentaSeleccionadaId(cuenta.id);
    setBeneficiarioTelefono(cuenta.telefono ?? '');
    setBeneficiarioBanco(cuenta.entidad_bancaria);
    setBeneficiarioCuenta(cuenta.numero_cuenta);
  };

  const limpiarBeneficiario = () => {
    setBeneficiarioSeleccionadoId(null);
    setCuentaSeleccionadaId(null);
    setBeneficiarioNombre('');
    setBeneficiarioTelefono('');
    setBeneficiarioCi('');
    setBeneficiarioBanco('');
    setBeneficiarioCuenta('');
  };

  const beneficiarioSeleccionado = beneficiariosGuardados.find((b) => b.id === beneficiarioSeleccionadoId) ?? null;

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
    // Bloqueo sincrónico: se revisa y marca ANTES de cualquier `await`, así
    // que un segundo toque casi simultáneo (antes de que React re-renderice
    // el botón con `disabled`) no alcanza a colarse.
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setError(null);
    if (!usuario || !negocioId || !tasa || !conversion) {
      setError('Ingresa un monto válido.');
      enviandoRef.current = false;
      return;
    }
    if (!beneficiarioNombre.trim() || !beneficiarioCi.trim() || !beneficiarioBanco.trim() || !beneficiarioCuenta.trim()) {
      setError('Completa los datos del beneficiario en Venezuela.');
      enviandoRef.current = false;
      return;
    }
    if (!comprobanteUri) {
      setError('Sube la imagen de tu depósito.');
      enviandoRef.current = false;
      return;
    }

    setEnviando(true);
    // Si algo falla DESPUÉS de crear la fila (subida del comprobante o el
    // update posterior), se borra ese intento fallido antes de mostrar el
    // error -- así un reintento con el mismo formulario no genera OTRA
    // solicitud duplicada (la fila solo se sube a storage en
    // `comprobantes/<id de la solicitud>/...`, así que primero hace falta
    // el id: no se puede subir antes de insertar).
    let solicitudCreadaId: string | null = null;
    try {
      const { data: solicitud, error: insertError } = await supabase
        .from('solicitudes')
        .insert({
          cliente_id: usuario.id,
          negocio_operador_peru_id: negocioId,
          estado: 'EN_VERIFICACION',
          monto_pen: conversion.montoPen,
          tasa_pen_ves: conversion.tasaPenVes,
          monto_ves: conversion.montoVes,
          tasa_real_compra: tasa.tasa_adquisicion,
          monto_usd_bcv: equivalenteUsd,
          monto_eur_bcv: equivalenteEur,
          beneficiario_nombre: beneficiarioNombre.trim(),
          beneficiario_banco: beneficiarioBanco.trim(),
          beneficiario_cuenta: beneficiarioCuenta.trim(),
          beneficiario_ci: beneficiarioCi.trim(),
          beneficiario_telefono: beneficiarioTelefono.trim() || null,
          tipo_transferencia: tipoTransferencia,
          metodo_pago: metodoPago,
        })
        .select()
        .single();
      if (insertError || !solicitud) throw insertError ?? new Error('No se pudo crear la solicitud.');
      solicitudCreadaId = solicitud.id;

      const path = `${solicitud.id}/comprobante-cliente.${comprobanteExt}`;
      // fetch(...).blob() es muy lento en React Native para archivos locales
      // (el Blob nativo pasa por un puente adicional); arrayBuffer() lee el
      // archivo directo y sube mucho más rápido -- ver lib/imagenUtil.ts.
      const arrayBuffer = await (await fetch(comprobanteUri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(path, arrayBuffer, { upsert: true, contentType: mimeDeExtension(comprobanteExt) });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('comprobantes').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('solicitudes')
        .update({ comprobante_pago_url: publicUrl.publicUrl })
        .eq('id', solicitud.id);
      if (updateError) throw updateError;
      solicitudCreadaId = null; // Completa: ya no hay nada que revertir.

      if (guardarCuenta) {
        // Fase C: 1 beneficiario (por CI) puede tener varias cuentas
        // bancarias -- primero se guarda/actualiza la persona, luego la
        // cuenta específica usada en esta solicitud, dentro de ese
        // beneficiario.
        const { data: beneficiarioGuardado } = await supabase
          .from('beneficiarios_cliente')
          .upsert(
            { cliente_id: usuario.id, nombre: beneficiarioNombre.trim(), ci: beneficiarioCi.trim() },
            { onConflict: 'cliente_id,ci' }
          )
          .select()
          .single();
        if (beneficiarioGuardado) {
          await supabase.from('beneficiario_cuentas_bancarias').upsert(
            {
              beneficiario_id: beneficiarioGuardado.id,
              entidad_bancaria: beneficiarioBanco.trim(),
              numero_cuenta: beneficiarioCuenta.trim(),
              telefono: beneficiarioTelefono.trim() || null,
            },
            { onConflict: 'beneficiario_id,entidad_bancaria,numero_cuenta' }
          );
        }
      }

      setMontoPen('');
      limpiarBeneficiario();
      setComprobanteUri(null);
      setMostrarExito(true);
    } catch (err) {
      if (solicitudCreadaId) {
        await supabase.rpc('cancelar_solicitud_fallida', { p_solicitud_id: solicitudCreadaId });
      }
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    } finally {
      setEnviando(false);
      enviandoRef.current = false;
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
    <>
    <ScrollView contentContainerStyle={styles.container}>
      <RoleTag rol="cliente" />
      {!!perfil?.nombre_negocio && (
        <View style={styles.negocioRow}>
          {!!perfil.logo_url && <Image source={{ uri: perfil.logo_url }} style={styles.negocioLogo} resizeMode="cover" />}
          <Text style={styles.negocioNombre} numberOfLines={1}>
            {perfil.nombre_negocio}
          </Text>
        </View>
      )}
      <Text style={styles.bienvenida}>Bienvenido a Remesas Perú-Venezuela, {usuario?.nombre}</Text>
      <LiveClock />
      {!!perfil?.eslogan && <Text style={styles.eslogan}>&quot;{perfil.eslogan}&quot;</Text>}
      {!!perfil?.horario_inicio && !!perfil?.horario_fin && (
        <Text style={styles.horario}>
          Horario de atención: {perfil.horario_inicio} – {perfil.horario_fin}
        </Text>
      )}

      <View style={styles.filaTasas}>
        <View style={[styles.card, cardShadow, styles.tasaCard]}>
          <Text style={styles.tasaLabel}>Tasa del día (Soles → Bolívares)</Text>
          <Text style={styles.tasaValor}>{tasa ? `VES ${tasa.tasa_pen_ves}` : '—'}</Text>
        </View>
        <View style={[styles.card, cardShadow, styles.tasaCard]}>
          <Text style={styles.tasaLabel}>BCV — USD / EUR</Text>
          {bcvCargando ? (
            <ActivityIndicator color={colors.primary} />
          ) : bcv ? (
            <>
              <Text style={styles.bcvValor}>${bcv.usd_ves.toFixed(2)} VES</Text>
              <Text style={styles.bcvValor}>€{bcv.eur_ves.toFixed(2)} VES</Text>
            </>
          ) : (
            <Text style={styles.bcvValor}>No disponible</Text>
          )}
        </View>
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.nuevaSolicitudTitulo}>Nueva solicitud</Text>
        <Text style={styles.nuevaSolicitudTexto}>Ingrese el monto solicitado en la calculadora.</Text>
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
            <Text style={styles.resultadoBs}>VES {formatearBs(conversion.montoVes)}</Text>
            {bcv && (
              <Text style={styles.resultadoEquivalente}>
                ≈ ${equivalenteUsd!.toFixed(2)} · €{equivalenteEur!.toFixed(2)}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.seccionTitulo}>Convertidor de Divisas</Text>
        <Text style={styles.nuevaSolicitudTexto}>¿Tienes Dólares o Euros? Conviértelos a Soles y se cargan solos arriba.</Text>
        <View style={styles.convChipsRow}>
          {(['usd', 'eur'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.convChip, monedaConvertidor === m && styles.convChipActivo]}
              onPress={() => setMonedaConvertidor(m)}
            >
              <Text style={[styles.convChipTexto, monedaConvertidor === m && styles.convChipTextoActivo]}>
                {m === 'usd' ? 'Dólar' : 'Euro'}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.montoInput}
          value={montoConvertidor}
          onChangeText={setMontoConvertidor}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.montoLabel}>Monto en {monedaConvertidor === 'usd' ? 'Dólares' : 'Euros'}</Text>
        {conversionDivisaPen !== null ? (
          <View style={styles.resultado}>
            <Text style={styles.resultadoBs}>S/ {conversionDivisaPen.toFixed(2)}</Text>
          </View>
        ) : (
          !bcv && <Text style={styles.montoLabel}>No se pudo cargar la tasa BCV en este momento.</Text>
        )}
      </View>

      {conversion && (
        <>
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.seccionTitulo}>¿Quién recibe en Venezuela?</Text>

            {beneficiariosGuardados.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {beneficiariosGuardados.map((b) => (
                  <Pressable
                    key={b.id}
                    style={[styles.chip, beneficiarioSeleccionadoId === b.id && styles.chipActivo]}
                    onPress={() => elegirBeneficiario(b)}
                  >
                    <Text style={[styles.chipTexto, beneficiarioSeleccionadoId === b.id && styles.chipTextoActivo]} numberOfLines={1}>
                      {b.nombre}
                    </Text>
                  </Pressable>
                ))}
                <Pressable style={styles.chip} onPress={limpiarBeneficiario}>
                  <Text style={styles.chipTexto}>+ Nuevo</Text>
                </Pressable>
              </ScrollView>
            )}

            {beneficiarioSeleccionado && beneficiarioSeleccionado.cuentas.length > 1 && (
              <>
                <Text style={styles.label}>¿Con cuál cuenta de {beneficiarioSeleccionado.nombre}?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {beneficiarioSeleccionado.cuentas.map((c) => (
                    <Pressable
                      key={c.id}
                      style={[styles.chip, cuentaSeleccionadaId === c.id && styles.chipActivo]}
                      onPress={() => elegirCuentaGuardada(c)}
                    >
                      <Text style={[styles.chipTexto, cuentaSeleccionadaId === c.id && styles.chipTextoActivo]} numberOfLines={1}>
                        {c.entidad_bancaria} · {c.numero_cuenta}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <Field label="Nombre completo" value={beneficiarioNombre} onChangeText={setBeneficiarioNombre} />
            <Field label="Teléfono" value={beneficiarioTelefono} onChangeText={setBeneficiarioTelefono} keyboardType="phone-pad" />
            <Field label="Cédula (C.I.)" value={beneficiarioCi} onChangeText={setBeneficiarioCi} />
            <Text style={styles.label}>Tipo de transferencia</Text>
            <View style={styles.metodoRow}>
              {(
                [
                  { valor: 'transferencia_bancaria', etiqueta: 'Transferencia bancaria' },
                  { valor: 'pago_movil', etiqueta: 'Pago móvil' },
                ] as const
              ).map((op) => (
                <Pressable
                  key={op.valor}
                  style={[styles.metodoOption, tipoTransferencia === op.valor && styles.metodoOptionActive]}
                  onPress={() => setTipoTransferencia(op.valor)}
                >
                  <Text style={[styles.metodoText, tipoTransferencia === op.valor && styles.metodoTextActive]}>{op.etiqueta}</Text>
                </Pressable>
              ))}
            </View>
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

            {(perfil?.yape_telefono || perfil?.plin_telefono || perfil?.otro_medio_telefono) && (
              <View style={styles.telefonosPago}>
                {perfil?.yape_telefono && <CopyField label="Yape" value={perfil.yape_telefono} />}
                {perfil?.plin_telefono && <CopyField label="Plin" value={perfil.plin_telefono} />}
                {perfil?.otro_medio_telefono && (
                  <CopyField label={perfil.otro_medio_nombre || 'Otro medio de pago'} value={perfil.otro_medio_telefono} />
                )}
              </View>
            )}

            {cuentasOperador.map((c) => (
              <View key={c.id} style={styles.cuentaBanco}>
                <Text style={styles.cuentaBancoEntidad}>{c.entidad}</Text>
                {c.titular ? <CopyField label="Titular" value={c.titular} /> : null}
                <CopyField label="N° de cuenta" value={c.numero_cuenta} />
                {c.cci ? <CopyField label="CCI" value={c.cci} /> : null}
              </View>
            ))}

            <Text style={styles.label}>Forma de pago</Text>
            <View style={styles.metodoRow}>
              {(['yape', 'plin', 'banco'] as MetodoPago[]).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.metodoOption, metodoPago === m && styles.metodoOptionActive]}
                  onPress={() => setMetodoPago(m)}
                >
                  <Text style={[styles.metodoText, metodoPago === m && styles.metodoTextActive]}>
                    {m === 'yape' ? 'Yape' : m === 'plin' ? 'Plin' : 'Transferencia bancaria'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.seccionTitulo}>Comprobante de tu depósito</Text>
            {comprobanteUri ? (
              <>
                <Pressable style={styles.subirBtn} onPress={() => setMostrarZoomComprobante(true)}>
                  <Image source={{ uri: comprobanteUri }} style={styles.comprobantePreview} resizeMode="contain" />
                  <Text style={styles.verCompletoTexto}>🔍 Toca para verla completa y hacer zoom</Text>
                </Pressable>
                <Pressable style={styles.cambiarImagenBtn} onPress={elegirComprobante}>
                  <Text style={styles.cambiarImagenTexto}>Cambiar imagen</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.subirBtn} onPress={elegirComprobante}>
                <Text style={styles.subirBtnTexto}>Elegir captura del depósito</Text>
              </Pressable>
            )}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.enviarBtn} onPress={enviarSolicitud} disabled={enviando}>
            {enviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.enviarBtnTexto}>Enviar solicitud</Text>}
          </Pressable>
        </>
      )}
    </ScrollView>
    <MensajeModal
      visible={mostrarExito}
      titulo="¡Gracias por preferirnos!!!"
      mensaje='Solicitud enviada exitosamente, en breve realizaremos la transferencia. Para verificar su solicitud revise su Lista de "Solicitudes realizadas".'
      onCerrar={() => setMostrarExito(false)}
    />
    <ZoomableImageModal visible={mostrarZoomComprobante} uri={comprobanteUri} onClose={() => setMostrarZoomComprobante(false)} />
    </>
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
  avisoSinNegocio: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 20 },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 12, paddingBottom: 48 },
  negocioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  negocioLogo: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.cardAlt },
  negocioNombre: { color: colors.accent, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  bienvenida: { color: colors.text, fontSize: 25, fontWeight: '800', marginBottom: -4 },
  eslogan: { color: colors.accent, fontSize: 15, fontStyle: 'italic', fontWeight: '600' },
  horario: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  filaTasas: { flexDirection: 'row', gap: 12 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16 },
  tasaCard: { flex: 1, gap: 4 },
  tasaLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  tasaValor: { color: colors.text, fontSize: 25, fontWeight: '900' },
  bcvValor: { color: colors.text, fontSize: 17, fontWeight: '700' },
  seccionTitulo: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  nuevaSolicitudTitulo: { color: colors.text, fontSize: 21, fontWeight: '900', textTransform: 'uppercase' },
  nuevaSolicitudTexto: { color: colors.textMuted, fontSize: 15, marginTop: 2, marginBottom: 10 },
  montoInput: { color: colors.text, fontSize: 41, fontWeight: '900' },
  montoLabel: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  resultado: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  resultadoBs: { color: colors.accent, fontSize: 30, fontWeight: '900' },
  resultadoEquivalente: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
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
  chipTexto: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  chipTextoActivo: { color: colors.text },
  convChipsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  convChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 18 },
  convChipActivo: { borderColor: colors.accent, backgroundColor: `${colors.accent}22` },
  convChipTexto: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  convChipTextoActivo: { color: colors.accent },
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
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  switchLabel: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  pagarA: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  telefonosPago: { marginBottom: 4 },
  cuentaBanco: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  cuentaBancoEntidad: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  metodoRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  metodoOption: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  metodoOptionActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  metodoText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
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
  subirBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  comprobantePreview: { width: '100%', height: 200, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  verCompletoTexto: { color: colors.accent, fontWeight: '700', fontSize: 13, marginTop: 8 },
  cambiarImagenBtn: { alignSelf: 'center', marginTop: 8 },
  cambiarImagenTexto: { color: colors.textMuted, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  error: { color: colors.danger, fontSize: 15 },
  enviarBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  enviarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 18 },
});
