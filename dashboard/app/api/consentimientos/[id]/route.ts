import { NextRequest } from 'next/server';
import { consentimientosService } from '@/lib/services/consentimientos';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { updateConsentimientoSchema } from '@/lib/validations';

// GET /api/consentimientos/[id]
export const GET = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const c = await consentimientosService.getById(id);
    return ok({ data: c });
  },
);

// PATCH /api/consentimientos/[id]
export const PATCH = apiHandler(
  async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const body = await parseBody(request, updateConsentimientoSchema);
    const updated = await consentimientosService.update(id, body);
    return ok({ data: updated });
  },
);

// DELETE /api/consentimientos/[id]
export const DELETE = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const result = await consentimientosService.eliminar(id);
    return ok(result);
  },
);
