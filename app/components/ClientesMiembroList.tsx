import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { generarYCompartirExcel } from '../lib/excelReporte';
import { generarYCompartirPdf } from '../lib/pdfReporte';
import { Usuario, OperadorPeruMiembro } from '../types/database';
import { colors, radius } from '../constants/theme';

// Lista de clientes de UN operador de Perú miembro, para uso del Operador
// principal dentro de Perfil (ver perfil.tsx, sección "OPERADORES EN
// PERÚ"). Reutiliza el mismo RPC `derivar_cliente` y los mismos
// generadores de Excel/PDF que ya usa app/(operador-peru)/clientes.tsx --
// acá solo cambia dónde vive la UI (por operador, no en una lista única).
export function ClientesMiembroList({
  miembro,
  clientes,
  miembros,
  onDerivado,
}: {
  miembro: OperadorPeruMiembro;
  clientes: Usuario[];
  /** Equipo completo del negocio, para elegir a quién derivar. */
  miembros: OperadorPeruMiembro[];
  onDerivado: () => void;
}) {
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [derivando, setDerivando] = useState<Usuario | null>(null);
  const [derivandoMiembroId, setDerivandoMiembroId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const exportarExcel = async () => {
    setExportandoExcel(true);
    try {
      const filas = clientes.map((c) => ({
        Nombre: c.nombre,
        Correo: c.email ?? '',
        Teléfono: c.telefono ?? '',
        País: c.pais ?? '',
        'Fecha de registro': new Date(c.created_at).toLocaleString('es-PE'),
      }));
      await generarYCompartirExcel(`clientes-${miembro.nombre}`, 'Clientes', filas);
    } finally {
      setExportandoExcel(false);
    }
  };

  const exportarPdf = async () => {
    setExportandoPdf(true);
    try {
      const filas = clientes
        .map(
          (c) => `<tr>
            <td>${c.nombre}</td>
            <td>${c.email ?? '—'}</td>
            <td>${c.telefono ?? '—'}</td>
            <td>${c.pais ?? '—'}</td>
            <td>${new Date(c.created_at).toLocaleDateString('es-PE')}</td>
          </tr>`
        )
        .join('');

      await generarYCompartirPdf(
        `Clientes de ${miembro.nombre}`,
        `${clientes.length} clientes`,
        `<table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>País</th><th>Registrado</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>`
      );
    } finally {
      setExportandoPdf(false);
    }
  };

  const abrirDerivacion = (cliente: Usuario) => {
    setDerivando(cliente);
    setDerivandoMiembroId(null);
  };

  const confirmarDerivacion = async () => {
    if (!derivando || !derivandoMiembroId) return;
    setEnviando(true);
    const { error } = await supabase.rpc('derivar_cliente', {
      p_cliente_id: derivando.id,
      p_operador_peru_miembro_id: derivandoMiembroId,
    });
    setEnviando(false);
    setDerivando(null);
    setDerivandoMiembroId(null);
    if (error) {
      Alert.alert('No se pudo derivar', error.message);
      return;
    }
    onDerivado();
  };

  return (
    <View style={styles.container}>
      {clientes.length === 0 ? (
        <Text style={styles.vacio}>Todavía no tiene clientes registrados.</Text>
      ) : (
        <>
          <View style={styles.exportRow}>
            <Pressable style={styles.excelBtn} onPress={exportarExcel} disabled={exportandoExcel}>
              {exportandoExcel ? <ActivityIndicator color="#fff" /> : <Text style={styles.excelBtnTexto}>Excel</Text>}
            </Pressable>
            <Pressable style={styles.pdfBtn} onPress={exportarPdf} disabled={exportandoPdf}>
              {exportandoPdf ? <ActivityIndicator color={colors.text} /> : <Text style={styles.pdfBtnTexto}>PDF</Text>}
            </Pressable>
          </View>
          {clientes.map((c) => (
            <View key={c.id} style={styles.clienteFila}>
              <View style={styles.clienteDatos}>
                <Text style={styles.clienteNombre}>{c.nombre}</Text>
                <Text style={styles.clienteDato}>{c.email}</Text>
                <Text style={styles.clienteDato}>
                  {c.telefono ?? 'Sin teléfono'} · {c.pais ?? 'Sin país'}
                </Text>
              </View>
              <Pressable style={styles.derivarBtn} onPress={() => abrirDerivacion(c)}>
                <Text style={styles.derivarBtnTexto}>Derivar →</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      <Modal visible={!!derivando} transparent animationType="fade" onRequestClose={() => setDerivando(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Derivar cliente</Text>
            <Text style={styles.modalTexto}>
              {derivando ? `¿A qué operador de Perú quieres derivar a ${derivando.nombre}?` : ''}
            </Text>
            {miembros.filter((m) => m.id !== miembro.id).length === 0 ? (
              <Text style={styles.vacio}>No hay otro operador de Perú en tu equipo para derivar.</Text>
            ) : (
              miembros
                .filter((m) => m.id !== miembro.id)
                .map((m) => {
                  const seleccionado = derivandoMiembroId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.miembroOpcion, seleccionado && styles.miembroOpcionActivo]}
                      onPress={() => setDerivandoMiembroId(m.id)}
                    >
                      <Text style={[styles.miembroOpcionNombre, seleccionado && { color: colors.text }]}>{m.nombre}</Text>
                      {seleccionado && <Text style={styles.miembroOpcionCheck}>✓</Text>}
                    </Pressable>
                  );
                })
            )}
            <View style={styles.modalAcciones}>
              <Pressable style={styles.modalCancelar} onPress={() => setDerivando(null)}>
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmar, (!derivandoMiembroId || enviando) && styles.modalConfirmarDeshabilitado]}
                disabled={!derivandoMiembroId || enviando}
                onPress={confirmarDerivacion}
              >
                {enviando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.modalConfirmarTexto}>Derivar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  vacio: { color: colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  exportRow: { flexDirection: 'row', gap: 8 },
  excelBtn: { flex: 1, backgroundColor: colors.success, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  excelBtnTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pdfBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center' },
  pdfBtnTexto: { color: colors.text, fontWeight: '700', fontSize: 14 },
  clienteFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  clienteDatos: { flex: 1, gap: 1 },
  clienteNombre: { color: colors.text, fontSize: 15, fontWeight: '700' },
  clienteDato: { color: colors.textMuted, fontSize: 13 },
  derivarBtn: { paddingHorizontal: 4 },
  derivarBtnTexto: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 20, gap: 10, width: '100%', maxWidth: 420 },
  modalTitulo: { color: colors.text, fontSize: 21, fontWeight: '900' },
  modalTexto: { color: colors.textMuted, fontSize: 15, lineHeight: 19 },
  miembroOpcion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    gap: 8,
  },
  miembroOpcionActivo: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  miembroOpcionNombre: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  miembroOpcionCheck: { color: colors.success, fontWeight: '900' },
  modalAcciones: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalCancelar: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  modalCancelarTexto: { color: colors.textMuted, fontWeight: '700' },
  modalConfirmar: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  modalConfirmarDeshabilitado: { opacity: 0.4 },
  modalConfirmarTexto: { color: colors.text, fontWeight: '700' },
});
