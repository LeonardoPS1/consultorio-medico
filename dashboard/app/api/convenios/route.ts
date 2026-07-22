import { NextRequest } from 'next/server';
import { conveniosService } from '@/lib/services/convenios';
import { apiHandler, ok, created, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { createConvenioSchema } from '@/lib/validations';

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  const estado = searchParams.get('estado') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;

  const tenantId = session.user.tenantId ?? '00000000-0000-0000-0000-000000000000';
  const result = await conveniosService.list(tenantId, {
    estado,
    limit,
    offset,
  });

  return ok(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') fail('Solo administradores pueden crear convenios', 403);

  const body = await parseBody(request, createConvenioSchema);

  const tenantId = session.user.tenantId ?? '00000000-0000-0000-0000-000000000000';
  const nuevo = await conveniosService.create({
    tenantOrigenId: tenantId,
    tenantDestinoId: body.tenantDestinoId,
    fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : new Date(),
    fechaFin: body.fechaFin ? new Date(body.fechaFin) : undefined,
    metadata: body.metadata,
  });

  return created(nuevo);
});
