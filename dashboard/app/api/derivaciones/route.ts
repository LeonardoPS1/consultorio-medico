import { NextRequest } from 'next/server';
import { derivacionesService } from '@/lib/services/derivaciones';
import { apiHandler, success, created, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { createDerivacionSchema } from '@/lib/validations';

// GET /api/derivaciones?estado=&pacienteId=&medicoId=&search=&limit=&offset=
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  const estado = searchParams.get('estado') || undefined;
  const pacienteId = searchParams.get('pacienteId') || undefined;
  const medicoId = searchParams.get('medicoId') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;

  // Stats mode
  if (searchParams.get('stats') === 'true') {
    const stats = await derivacionesService.getStats(medicoId);
    return ok(stats);
  }

  // Medicos list mode
  if (searchParams.get('medicos') === 'true') {
    const medicos = await derivacionesService.getMedicos();
    return ok({ data: medicos });
  }

  const result = await derivacionesService.list({
    limit, offset, estado, pacienteId, medicoId, search,
  });
  return ok(result);
});

// POST /api/derivaciones
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const body = await parseBody(request, createDerivacionSchema);

  const nueva = await derivacionesService.create(body);
  return created(nueva);
});
