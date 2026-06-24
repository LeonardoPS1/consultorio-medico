import { NextRequest } from 'next/server';
import { derivacionesService } from '@/lib/services/derivaciones';
import { apiHandler, ok, notFound } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { updateDerivacionSchema } from '@/lib/validations';

// GET /api/derivaciones/[id]
export const GET = apiHandler(
  async (_request: NextRequest, { params }: { params: { id: string } }) => {
    await requireAuth();
    const derivacion = await derivacionesService.getById(params.id);
    return ok({ data: derivacion });
  },
);

// PATCH /api/derivaciones/[id]
export const PATCH = apiHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    await requireAuth();
    const body = await parseBody(request, updateDerivacionSchema);
    const updated = await derivacionesService.update(params.id, body);
    return ok({ data: updated });
  },
);

// DELETE /api/derivaciones/[id]
export const DELETE = apiHandler(
  async (_request: NextRequest, { params }: { params: { id: string } }) => {
    await requireAuth();
    const result = await derivacionesService.eliminar(params.id);
    return ok(result);
  },
);
