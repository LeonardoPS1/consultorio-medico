import { NextRequest } from 'next/server';
import { conveniosService } from '@/lib/services/convenios';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { updateConvenioSchema } from '@/lib/validations';

export const GET = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const data = await conveniosService.getById(id);
    return ok({ data });
  },
);

export const PATCH = apiHandler(
  async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    const session = await requireAuth();
    if (session.user.role !== 'admin') fail('Solo administradores pueden modificar convenios', 403);

    const body = await parseBody(request, updateConvenioSchema);
    const updated = await conveniosService.updateEstado(id, body.estado);
    return ok({ data: updated });
  },
);

export const DELETE = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    const session = await requireAuth();
    if (session.user.role !== 'admin') fail('Solo administradores pueden eliminar convenios', 403);

    const result = await conveniosService.softDelete(id);
    return ok(result);
  },
);
