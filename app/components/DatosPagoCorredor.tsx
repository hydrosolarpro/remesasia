import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { CorredorId } from '../lib/corredor';
import { colors, radius } from '../constants/theme';

// Datos de pago del negocio para UN corredor distinto de Perú-Venezuela
// (los de Perú siguen en Perfil/onboarding como siempre): plataformas de
// pago con NOMBRE LIBRE, QR de texto (número), medio extra y cuentas
// bancarias. Es lo que el cliente ve en "Datos para pagar en <país>".
interface Cuenta {
  id: string;
  entidad: string;
  titular: string;
  numero_cuenta: string;
}

export function DatosPagoCorredor({
  corredor,
  sugerencia1,
  sugerencia2,
  etiquetaCuenta,
}: {
  corredor: CorredorId;
  sugerencia1: string;
  sugerencia2: string;
  etiquetaCuenta: string;
}) {
  const { usuario } = useAuth();
  const [n1, setN1] = useState('');
  const [t1, setT1] = useState('');
  const [n2, setN2] = useState('');
  const [t2, setT2] = useState('');
  const [nOtro, setNOtro] = useState('');
  const [tOtro, setTOtro] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [entidad, setEntidad] = useState('');
  const [titular, setTitular] = useState('');
  const [numero, setNumero] = useState('');

  const aviso = (t: string) => (Platform.OS === 'web' ? window.alert(t) : Alert.alert('Datos de pago', t));

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase
        .from('perfil_negocio_corredor')
        .select('billetera_1_nombre, billetera_1_telefono, billetera_2_nombre, billetera_2_telefono, otro_medio_nombre, otro_medio_telefono')
        .eq('operador_peru_id', usuario.id)
        .eq('corredor', corredor)
        .maybeSingle(),
      supabase
        .from('cuentas_bancarias_operador')
        .select('id, entidad, titular, numero_cuenta')
        .eq('operador_peru_id', usuario.id)
        .eq('corredor', corredor)
        .order('created_at', { ascending: true }),
    ]);
    setN1(p?.billetera_1_nombre ?? '');
    setT1(p?.billetera_1_telefono ?? '');
    setN2(p?.billetera_2_nombre ?? '');
    setT2(p?.billetera_2_telefono ?? '');
    setNOtro(p?.otro_medio_nombre ?? '');
    setTOtro(p?.otro_medio_telefono ?? '');
    setCuentas((c as Cuenta[] | null) ?? []);
  }, [usuario?.id, corredor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarPlataformas = async () => {
    if (!usuario) return;
    setGuardando(true);
    const { error } = await supabase.from('perfil_negocio_corredor').upsert(
      {
        operador_peru_id: usuario.id,
        corredor,
        billetera_1_nombre: n1.trim() || null,
        billetera_1_telefono: t1.trim() || null,
        billetera_2_nombre: n2.trim() || null,
        billetera_2_telefono: t2.trim() || null,
        otro_medio_nombre: nOtro.trim() || null,
        otro_medio_telefono: tOtro.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'operador_peru_id,corredor' }
    );
    setGuardando(false);
    if (error) aviso(`No se pudo guardar: ${error.message}`);
    else aviso('Plataformas de pago guardadas.');
  };

  const agregarCuenta = async () => {
    if (!usuario) return;
    if (!entidad.trim() || !numero.trim()) {
      aviso('Escribe la entidad y el número de cuenta.');
      return;
    }
    const { error } = await supabase.from('cuentas_bancarias_operador').insert({
      operador_peru_id: usuario.id,
      corredor,
      entidad: entidad.trim(),
      titular: titular.trim(),
      numero_cuenta: numero.trim(),
      cci: '',
    });
    if (error) {
      aviso(`No se pudo agregar: ${error.message}`);
      return;
    }
    setEntidad('');
    setTitular('');
    setNumero('');
    cargar();
  };

  const quitarCuenta = async (id: string) => {
    const { error } = await supabase.from('cuentas_bancarias_operador').delete().eq('id', id);
    if (error) aviso(`No se pudo quitar: ${error.message}`);
    else cargar();
  };

  const campo = (valor: string, set: (t: string) => void, placeholder: string, extra?: object) => (
    <TextInput
      style={styles.input}
      value={valor}
      onChangeText={set}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      {...extra}
    />
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.titulo}>Plataformas de pago (tú pones el nombre)</Text>
      <Text style={styles.ayuda}>
        Escribe el nombre de la plataforma tal como la usa tu cliente y el número/usuario donde te paga. Puedes dejar
        en blanco las que no uses.
      </Text>
      {campo(n1, setN1, `Nombre de la plataforma 1 (ej. ${sugerencia1 || 'Nequi'})`)}
      {campo(t1, setT1, 'Número o usuario', { keyboardType: 'phone-pad' })}
      {campo(n2, setN2, `Nombre de la plataforma 2 (ej. ${sugerencia2 || 'Daviplata'})`)}
      {campo(t2, setT2, 'Número o usuario', { keyboardType: 'phone-pad' })}
      {campo(nOtro, setNOtro, 'Otra plataforma (nombre libre)')}
      {campo(tOtro, setTOtro, 'Número o usuario', { keyboardType: 'phone-pad' })}
      <Pressable style={styles.boton} onPress={guardarPlataformas} disabled={guardando}>
        <Text style={styles.botonTexto}>{guardando ? 'Guardando…' : 'Guardar plataformas'}</Text>
      </Pressable>

      <Text style={[styles.titulo, { marginTop: 12 }]}>Cuentas bancarias de este país</Text>
      {cuentas.length === 0 && <Text style={styles.ayuda}>Todavía no hay cuentas.</Text>}
      {cuentas.map((c) => (
        <View key={c.id} style={styles.cuenta}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cuentaNombre}>{c.entidad}</Text>
            <Text style={styles.ayuda}>
              {c.titular ? `${c.titular} · ` : ''}
              {etiquetaCuenta}: {c.numero_cuenta}
            </Text>
          </View>
          <Pressable onPress={() => quitarCuenta(c.id)}>
            <Text style={styles.quitar}>✕</Text>
          </Pressable>
        </View>
      ))}
      {campo(entidad, setEntidad, 'Entidad / banco')}
      {campo(titular, setTitular, 'Titular')}
      {campo(numero, setNumero, etiquetaCuenta || 'Nº de cuenta')}
      <Pressable style={styles.boton} onPress={agregarCuenta}>
        <Text style={styles.botonTexto}>Agregar cuenta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingTop: 8 },
  titulo: { color: colors.text, fontSize: 15, fontWeight: '800' },
  ayuda: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 15,
  },
  boton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  cuenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  cuentaNombre: { color: colors.text, fontSize: 15, fontWeight: '700' },
  quitar: { color: colors.danger, fontSize: 18, fontWeight: '800', padding: 4 },
});
