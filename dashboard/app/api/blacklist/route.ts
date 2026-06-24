import { NextRequest } from 'next/server';
import { blacklistService } from '@/lib/services/blacklist';
import { apiHandler, ok, created } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { createBlacklistSchema } from '@/lib/validations';

// GET /api/blacklist?activo=&pacienteId=&search=&limit=&offset=
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  const activo = searchParams.has('activo') ? searchParams.get('activo') === 'true' : undefined;
  const pacienteId = searchParams.get('pacienteId') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Number(searchParams.get('offset')) || 0;

  // Stats mode
  if (searchParams.get('stats') === 'true') {
    const stats = await blacklistService.getStats();
    return ok(stats);
  }

  const result = await blacklistService.list({
    limit,
    offset,
    activo,
    pacienteId,
    search,
  });
  return ok(result);
});

// POST /api/blacklist
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const body = await parseBody(request, createBlacklistSchema);
  const nueva = await blacklistService.create(body);
  return created(nueva);
});
