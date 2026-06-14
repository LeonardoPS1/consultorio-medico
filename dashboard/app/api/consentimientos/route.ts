import { NextRequest } from 'next/server';
import { consentimientosService } from '@/lib/services/consentimientos';
import { apiHandler, ok, created } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { createConsentimientoSchema } from '@/lib/validations';

// GET /api/consentimientos?tipo=&pacienteId=&medicoId=&search=&limit=&offset=
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  const tipo = searchParams.get('tipo') || undefined;
  const pacienteId = searchParams.get('pacienteId') || undefined;
  const medicoId = searchParams.get('medicoId') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;

  // Stats mode
  if (searchParams.get('stats') === 'true') {
    const stats = await consentimientosService.getStats();
    return ok(stats);
  }

  const result = await consentimientosService.list({
    limit, offset, tipo, pacienteId, medicoId, search,
  });
  return ok(result);
});

// POST /api/consentimientos
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const body = await parseBody(request, createConsentimientoSchema);
  const nuevo = await consentimientosService.create(body);
  return created(nuevo);
});
