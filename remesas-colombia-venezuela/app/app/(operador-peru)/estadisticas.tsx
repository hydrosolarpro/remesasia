import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../lib/auth';
import { resolverContextoOperador } from '../../lib/sesionOperador';
import { EstadisticasView } from '../../components/EstadisticasView';
import { colors } from '../../constants/theme';

export default function EstadisticasOperador() {
  const { usuario } = useAuth();
  const [negocioId, setNegocioId] = useState<string | null | undefined>(undefined);
  const [tipoSesion, setTipoSesion] = useState<'principal' | 'miembro'>('principal');
  const [miembroId, setMiembroId] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    resolverContextoOperador(usuario).then((ctx) => {
      setNegocioId(ctx.negocioId);
      if (ctx.tipo === 'principal') {
        setTipoSesion('principal');
        setMiembroId(null);
      } else {
        setTipoSesion('miembro');
        setMiembroId(ctx.miembroId);
      }
    });
  }, [usuario]);

  if (!usuario || negocioId === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!negocioId) return null;

  return (
    <EstadisticasView operadorPeruId={negocioId} esDuenio={tipoSesion === 'principal'} tipoSesion={tipoSesion} miembroId={miembroId} />
  );
}
