import { NextRequest } from 'next/server';
import { consentimientosService } from '@/lib/services/consentimientos';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { updateConsentimientoSchema } from '@/lib/validations';

// GET /api/consentimientos/[id]
export const GET = apiHandler(
  async (_request: NextRequest, { params }: { params: { id: string } }) => {
    await requireAuth();
    const c = await consentimientosService.getById(params.id);
    return ok({ data: c });
  },
);

// PATCH /api/consentimientos/[id]
export const PATCH = apiHandler(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    await requireAuth();
    const body = await parseBody(request, updateConsentimientoSchema);
    const updated = await consentimientosService.update(params.id, body);
    return ok({ data: updated });
  },
);

// DELETE /api/consentimientos/[id]
export const DELETE = apiHandler(
  async (_request: NextRequest, { params }: { params: { id: string } }) => {
    await requireAuth();
    const result = await consentimientosService.eliminar(params.id);
    return ok(result);
  },
);
