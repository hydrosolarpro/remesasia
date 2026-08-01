import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { registrarPushToken } from '../../lib/notifications';
import { OperadorVenezuelaPerfil, OperadorPeruMiembro, Usuario } from '../../types/database';
import { colors, radius, cardShadow } from '../../constants/theme';
import { Collapsible } from '../../components/Collapsible';

interface MiembroEditable {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
}

// El Operador Venezuela ve: su teléfono, el equipo de Perú que le fue
// asignado ("OPERADORES EN PERÚ – EQUIPO") con opción a editar nombre,
// correo y teléfono (guardando en operador_peru_miembro, por lo que se
// refleja automáticamente en el perfil del Operador principal de Perú), y
// los datos del Operador principal de Perú en solo lectura.
export default function Perfil() {
  const { usuario } = useAuth();
  const [veRow, setVeRow] = useState<OperadorVenezuelaPerfil | null>(null);
  const [principal, setPrincipal] = useState<Usuario | null>(null);
  const [equipo, setEquipo] = useState<MiembroEditable[]>([]);
  const [guardandoVe, setGuardandoVe] = useState(false);
  const [guardandoMiembroId, setGuardandoMiembroId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeVe, setMensajeVe] = useState<string | null>(null);
  const [guardadoVe, setGuardadoVe] = useState(false);
  const [errorVe, setErrorVe] = useState<string | null>(null);

  useEffect(() => {
    if (usuario) registrarPushToken(usuario.id);
  }, [usuario]);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    const { data: perfil } = await supabase
      .from('operador_venezuela_perfil')
      .select('*')
      .eq('usuario_id', usuario.id)
      .maybeSingle();
    const row = perfil as OperadorVenezuelaPerfil | null;
    setVeRow(row);
    if (row) {
      const [principalRes, equipoRes] = await Promise.all([
        supabase.from('usuarios').select('*').eq('id', row.operador_peru_id).maybeSingle(),
        supabase
          .from('operador_peru_miembro')
          .select('id, nombre, telefono, email')
          .eq('operador_venezuela_id', row.id)
          .order('created_at', { ascending: true }),
      ]);
      setPrincipal((principalRes.data as Usuario | null) ?? null);
      setEquipo(
        ((equipoRes.data as Pick<OperadorPeruMiembro, 'id' | 'nombre' | 'telefono' | 'email'>[] | null) ?? []).map((m) => ({
          id: m.id,
          nombre: m.nombre,
          telefono: m.telefono ?? '',
          email: m.email ?? '',
        }))
      );
    }
    setCargando(false);
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const editarMiembro = (id: string, campo: 'nombre' | 'telefono' | 'email', valor: string) => {
    setEquipo((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  };

  const guardarMiembro = async (miembro: MiembroEditable) => {
    if (!miembro.nombre.trim() || !miembro.email.trim()) {
      setErrorVe('Completa el nombre y el correo del operador de Perú.');
      return;
    }
    setGuardandoMiembroId(miembro.id);
    setErrorVe(null);
    const { error } = await supabase
      .from('operador_peru_miembro')
      .update({
        nombre: miembro.nombre.trim(),
        telefono: miembro.telefono.trim() || null,
        email: miembro.email.trim().toLowerCase(),
      })
      .eq('id', miembro.id);
    setGuardandoMiembroId(null);
    if (error) {
      setErrorVe(error.message);
      return;
    }
    setMensajeVe(`Datos de ${miembro.nombre.trim()} actualizados. Se reflejan en el perfil del Operador principal de Perú.`);
    setTimeout(() => setMensajeVe(null), 3000);
  };

  const guardarMisDatos = async () => {
    if (!veRow) return;
    setErrorVe(null);
    setGuardandoVe(true);
    const { error } = await supabase
      .from('operador_venezuela_perfil')
      .update({
        nombre: veRow.nombre.trim(),
        telefono: veRow.telefono?.trim() || null,
        email: veRow.email?.trim().toLowerCase() ?? null,
      })
      .eq('id', veRow.id);
    setGuardandoVe(false);
    if (error) {
      setErrorVe(error.message);
      return;
    }
    setGuardadoVe(true);
    setTimeout(() => setGuardadoVe(false), 2000);
  };

  if (!usuario || cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.rolTitulo}>OPERADOR DE VENEZUELA</Text>
      <Text style={styles.nombre}>{usuario.nombre}</Text>
      <Text style={styles.email}>{usuario.email}</Text>

      {/* Datos del Operador principal de Perú: solo lectura, siempre primero */}
      {principal && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>OPERADOR PRINCIPAL DE PERÚ</Text>
          <Text style={styles.miembroNombre}>{principal.nombre}</Text>
          <Text style={styles.miembroDato}>{principal.email}</Text>
          <Text style={styles.miembroDato}>{principal.telefono ?? 'Sin teléfono'}</Text>
        </View>
      )}

      {/* Sus propios datos: nombre, correo y teléfono editables */}
      {veRow && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>Mis datos</Text>
          <Text style={styles.cardTexto}>Estos cambios se actualizan automáticamente en el perfil del Operador principal de Perú.</Text>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={veRow.nombre}
            onChangeText={(t) => setVeRow({ ...veRow, nombre: t })}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            value={veRow.email ?? ''}
            onChangeText={(t) => setVeRow({ ...veRow, email: t })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={veRow.telefono ?? ''}
            onChangeText={(t) => setVeRow({ ...veRow, telefono: t })}
            keyboardType="phone-pad"
            placeholder="+58 999 999 999"
            placeholderTextColor={colors.textMuted}
          />
          {errorVe && <Text style={styles.error}>{errorVe}</Text>}
          <Pressable style={styles.guardarBtn} onPress={guardarMisDatos} disabled={guardandoVe}>
            {guardandoVe ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.guardarBtnTexto}>{guardadoVe ? '✓ Guardado' : 'Guardar mis datos'}</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* % de comisión: lo asigna el Operador principal, acá solo se ve. */}
      {veRow && (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitulo}>% Comisión asignada</Text>
          <Text style={styles.miembroNombre}>{veRow.comision_pct ?? 0}%</Text>
        </View>
      )}

      {/* OPERADORES EN PERÚ – EQUIPO: los miembros asignados a este VE */}
      <View style={[styles.card, cardShadow]}>
        <Text style={styles.cardTitulo}>OPERADORES EN PERÚ – EQUIPO</Text>
        <Text style={styles.cardTexto}>
          Operadores de Perú que el Operador principal te asignó. Edita sus datos; se actualizan automáticamente en el perfil del Operador
          principal de Perú.
        </Text>
        {equipo.length === 0 ? (
          <Text style={styles.cardTexto}>Todavía no tienes operadores de Perú asignados.</Text>
        ) : (
          equipo.map((m) => (
            <Collapsible key={m.id} titulo={m.nombre || 'Operador de Perú'} subtitulo={m.email || 'Sin correo'}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={m.nombre}
                onChangeText={(t) => editarMiembro(m.id, 'nombre', t)}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>Correo</Text>
              <TextInput
                style={styles.input}
                value={m.email}
                onChangeText={(t) => editarMiembro(m.id, 'email', t)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={m.telefono}
                onChangeText={(t) => editarMiembro(m.id, 'telefono', t)}
                keyboardType="phone-pad"
                placeholder="+51 999 999 999"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable style={styles.guardarBtn} onPress={() => guardarMiembro(m)} disabled={guardandoMiembroId === m.id}>
                {guardandoMiembroId === m.id ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.guardarBtnTexto}>Guardar datos de {m.nombre.trim() || 'este operador'}</Text>
                )}
              </Pressable>
            </Collapsible>
          ))
        )}
        {mensajeVe && <Text style={styles.mensaje}>{mensajeVe}</Text>}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 24, gap: 12 },
  rolTitulo: { color: colors.accent, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  nombre: { color: colors.text, fontSize: 25, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: 16, marginTop: -8 },
  telefono: { color: colors.textMuted, fontSize: 16, marginBottom: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 16, gap: 8 },
  cardTitulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  cardTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 18 },
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
  error: { color: colors.danger, fontSize: 15, marginTop: 6 },
  mensaje: { color: colors.success, fontSize: 15, marginTop: 6 },
  guardarBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 14, alignItems: 'center', marginTop: 12 },
  guardarBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 16 },
  miembroNombre: { color: colors.text, fontSize: 16, fontWeight: '700' },
  miembroDato: { color: colors.textMuted, fontSize: 14 },
});
