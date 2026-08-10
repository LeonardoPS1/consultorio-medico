import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { getNoLeidosTotales } from '@/lib/services/mensajeria-interna';

/**
 * GET /api/mensajeria-interna/no-leidos - Total de mensajes internos no leídos del usuario.
 *   Usado para el badge de la navegación principal del dashboard.
 */
export const GET = apiHandler(async () => {
  const session = await requireAuth();
  const total = await getNoLeidosTotales(session.user.id);
  return success({ count: total });
});