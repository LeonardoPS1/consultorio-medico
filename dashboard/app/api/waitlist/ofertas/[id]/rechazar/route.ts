import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { waitlistService } from '@/lib/services/waitlist';

/**
 * POST /api/waitlist/ofertas/[id]/rechazar - Rechaza una oferta de turno
 */
export const POST = apiHandler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await requireAuth();
  const result = await waitlistService.rechazar(params.id);
  return success(result);
});
