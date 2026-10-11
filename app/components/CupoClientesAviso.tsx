import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { estadoCupoClientes, obtenerLimiteClientes, UMBRAL_AVISO_CUPO } from '../lib/plan';
import { colors, radius, cardShadow } from '../constants/theme';

// Cupo de clientes del plan del NEGOCIO: cuenta a todos los clientes
// registrados (de todos los corredores -- los clientes son del negocio, no
// de un corredor) contra el límite de su plan. Avisa al 90% y, al 100%, no
// se pueden registrar más clientes (lo hace cumplir la base de datos en
// canjear_invitacion / pin_provisionar*). Para más cupos: plan a la medida
// (S/ 1 por cliente al mes, prorrateado por los días que faltan del ciclo).
export function CupoClientesCard({
  usados,
  limite,
  plan,
  mostrarSolicitar = true,
}: {
  usados: number;
  limite: number;
  plan: string;
  mostrarSolicitar?: boolean;
}) {
  const estado = estadoCupoClientes(usados, limite);
  const ilimitado = !Number.isFinite(limite);
  const restantes = ilimitado ? Infinity : Math.max(0, limite - usados);
  const pct = ilimitado || limite <= 0 ? 0 : Math.min(100, Math.round((usados / limite) * 100));

  return (
    <View
      style={[
        styles.card,
        cardShadow,
        estado === 'por_agotarse' && styles.cardAviso,
        estado === 'agotado' && styles.cardAgotado,
      ]}
    >
      <Text style={styles.titulo}>Cupo de clientes</Text>
      <Text style={styles.texto}>
        {ilimitado
          ? `${usados} clientes — plan ${plan.toUpperCase()} sin límite.`
          : `${usados} de ${limite} clientes usados (${pct}%) — te quedan ${restantes} cupos. Se cuentan los clientes de todos tus corredores.`}
      </Text>

      {!ilimitado && (
        <View style={styles.barraFondo}>
          <View
            style={[
              styles.barraRelleno,
              {
                width: `${pct}%`,
                backgroundColor:
                  estado === 'agotado' ? colors.danger : estado === 'por_agotarse' ? colors.warning : colors.accent,
              },
            ]}
          />
        </View>
      )}

      {estado === 'por_agotarse' && (
        <Text style={styles.alerta}>
          ⚠ Se está agotando el cupo de clientes de tu plan (más del {Math.round(UMBRAL_AVISO_CUPO * 100)}%). Cuando
          llegues al tope no podrás registrar más clientes.
        </Text>
      )}
      {estado === 'agotado' && (
        <Text style={styles.error}>
          ⛔ Alcanzaste el tope de clientes de tu plan: no se pueden registrar más clientes hasta que amplíes tu cupo.
        </Text>
      )}

      {mostrarSolicitar && estado !== 'ok' && (
        <Pressable style={styles.boton} onPress={() => router.push('/(operador-peru)/perfil')}>
          <Text style={styles.botonTexto}>Solicitar plan a la medida (más cupos) →</Text>
        </Pressable>
      )}
      {mostrarSolicitar && estado !== 'ok' && (
        <Text style={styles.ayuda}>
          El plan a la medida cuesta S/ 1 por cliente al mes; si lo pides a mitad de ciclo, pagas solo la parte
          proporcional a los días que faltan.
        </Text>
      )}
    </View>
  );
}

/** Versión del Operador principal: busca por sí sola cuántos clientes tiene el negocio. */
export function CupoClientesPrincipal() {
  const { usuario } = useAuth();
  const [usados, setUsados] = useState<number | null>(null);

  useEffect(() => {
    if (!usuario || usuario.rol !== 'operador_peru') return;
    supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('rol', 'cliente')
      .eq('negocio_operador_peru_id', usuario.id)
      .is('eliminado_at', null)
      .then(({ count }) => setUsados(count ?? 0));
  }, [usuario?.id, usuario?.rol]);

  if (!usuario || usuario.rol !== 'operador_peru' || usados === null) return null;
  const limite = obtenerLimiteClientes(usuario.plan, usuario.limite_clientes_unlimited);
  // Solo molesta cuando hay algo que decir: el detalle completo está en Clientes.
  if (estadoCupoClientes(usados, limite) === 'ok') return null;
  return <CupoClientesCard usados={usados} limite={limite} plan={usuario.plan} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAviso: { borderColor: colors.warning },
  cardAgotado: { borderColor: colors.danger },
  titulo: { color: colors.text, fontSize: 16, fontWeight: '800' },
  texto: { color: colors.textMuted, fontSize: 15, lineHeight: 20 },
  barraFondo: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4 },
  alerta: { color: colors.warning, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  error: { color: colors.danger, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  boton: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 12, alignItems: 'center', marginTop: 4 },
  botonTexto: { color: colors.text, fontWeight: '700', fontSize: 15 },
  ayuda: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
