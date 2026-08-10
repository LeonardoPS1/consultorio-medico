import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { listarStaff } from '@/lib/services/mensajeria-interna';

/**
 * GET /api/mensajeria-interna/staff - Lista usuarios del staff del mismo tenant
 *   disponibles para iniciar una conversación (excluye al usuario autenticado).
 */
export const GET = apiHandler(async () => {
  const session = await requireAuth();
  const tenantId = session.user.tenantId ?? '00000000-0000-0000-0000-000000000000';
  const staff = await listarStaff(tenantId, session.user.id);
  return success(staff);
});