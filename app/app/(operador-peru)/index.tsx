import { useAuth } from '../../lib/auth';
import { PeruDashboardView } from '../../components/PeruDashboardView';

export default function PanelOperadorPeru() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  return <PeruDashboardView operadorPeruId={usuario.id} nombreUsuarioActual={usuario.nombre} restringido={false} />;
}
