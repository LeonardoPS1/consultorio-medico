import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { waitlistService } from '@/lib/services/waitlist';

/**
 * DELETE /api/waitlist/[id] - Quita paciente de lista de espera
 */
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const result = await waitlistService.quitar(params.id);
  return success(result);
});
