import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { waitlistService } from '@/lib/services/waitlist';

/**
 * DELETE /api/waitlist/[id] - Quita paciente de lista de espera
 */
export const DELETE = apiHandler(
  async (_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const result = await waitlistService.quitar(id);
    return success(result);
  },
);
