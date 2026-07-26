import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ClienteSolicitudRow } from '../../components/ClientSolicitudRow';
import { generarYCompartirExcel } from '../../lib/excelReporte';
import { Solicitud } from '../../types/database';
import { colors, radius } from '../../constants/theme';

const ETIQUETA_METODO_PAGO: Record<Solicitud['metodo_pago'], string> = { yape: 'Yape', plin: 'Plin', banco: 'Transferencia bancaria' };

export default function SolicitudesCliente() {
  const { usuario } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    const { data } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('cliente_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setSolicitudes((data as Solicitud[] | null) ?? []);
    setCargando(false);
  }, [usuario]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const enCurso = useMemo(() => solicitudes.filter((s) => !s.check_deposito_ve), [solicitudes]);
  const realizadas = useMemo(() => solicitudes.filter((s) => s.check_deposito_ve), [solicitudes]);

  // Numeración estable (más antigua = #1), no depende del orden de carga.
  const numeracion = useMemo(() => {
    const ordenadas = [...realizadas].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const mapa = new Map<string, number>();
    ordenadas.forEach((s, i) => mapa.set(s.id, i + 1));
    return mapa;
  }, [realizadas]);

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const filas = realizadas.map((s) => ({
        '#': numeracion.get(s.id) ?? '',
        'Fecha de envío': new Date(s.created_at).toLocaleString('es-PE'),
        Beneficiario: s.beneficiario_nombre,
        'C.I.': s.beneficiario_ci ?? '',
        'Entidad bancaria': s.beneficiario_banco,
        'N° cuenta': s.beneficiario_cuenta,
        'Monto (S/)': s.monto_pen,
        'Recibe (Bs)': s.monto_ves,
        'USD (BCV)': s.monto_usd_bcv ?? '',
        'EUR (BCV)': s.monto_eur_bcv ?? '',
        'Forma de pago': ETIQUETA_METODO_PAGO[s.metodo_pago],
        'Depósito en Venezuela': s.check_deposito_ve_at ? new Date(s.check_deposito_ve_at).toLocaleString('es-PE') : '',
      }));
      await generarYCompartirExcel('mis-solicitudes-realizadas', 'Solicitudes', filas);
    } finally {
      setExportando(false);
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
      <Text style={styles.seccionTitulo}>Solicitudes en curso ({enCurso.length})</Text>
      {enCurso.length === 0 && <Text style={styles.vacio}>No tienes solicitudes en curso.</Text>}
      <View style={styles.lista}>
        {enCurso.map((s) => (
          <ClienteSolicitudRow key={s.id} solicitud={s} />
        ))}
      </View>

      <View style={styles.seccionHeaderRow}>
        <Text style={styles.seccionTitulo}>Solicitudes realizadas ({realizadas.length})</Text>
        <Pressable style={styles.excelBtn} onPress={exportarExcel} disabled={exportando || realizadas.length === 0}>
          {exportando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.excelBtnTexto}>Excel</Text>}
        </Pressable>
      </View>
      {realizadas.length === 0 && <Text style={styles.vacio}>Todavía no tienes solicitudes completadas.</Text>}
      <View style={styles.lista}>
        {realizadas.map((s) => (
          <ClienteSolicitudRow key={s.id} solicitud={s} numero={numeracion.get(s.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: 20, gap: 10, paddingBottom: 48 },
  seccionTitulo: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  seccionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  excelBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  vacio: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  lista: { gap: 10 },
});
