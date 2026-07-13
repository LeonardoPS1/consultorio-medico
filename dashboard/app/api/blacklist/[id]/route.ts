import { NextRequest } from 'next/server';
import { blacklistService } from '@/lib/services/blacklist';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { updateBlacklistSchema } from '@/lib/validations';

// GET /api/blacklist/[id]
export const GET = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const entry = await blacklistService.getById(id);
    return ok({ data: entry });
  },
);

// PATCH /api/blacklist/[id]
export const PATCH = apiHandler(
  async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const body = await parseBody(request, updateBlacklistSchema);
    const updated = await blacklistService.update(id, body);
    return ok({ data: updated });
  },
);

// DELETE /api/blacklist/[id]
export const DELETE = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const result = await blacklistService.eliminar(id);
    return ok(result);
  },
);
