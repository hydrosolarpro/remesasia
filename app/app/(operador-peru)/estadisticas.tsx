import { useAuth } from '../../lib/auth';
import { EstadisticasView } from '../../components/EstadisticasView';

export default function EstadisticasOperador() {
  const { usuario } = useAuth();
  if (!usuario) return null;
  return <EstadisticasView operadorPeruId={usuario.id} />;
}
