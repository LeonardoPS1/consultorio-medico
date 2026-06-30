import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { generarDesdeGitLog } from '@/lib/services/novedades';

export const dynamic = 'force-dynamic';

// ─── POST /api/novedades/generar ─────────────────────────
// Analiza git log y genera entradas de novedades automáticas (solo admin)
// Query params: ?desde=1.15.0 (tag opcional)
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    return fail('Solo administradores pueden generar novedades', 403);
  }

  const { searchParams } = new URL(request.url);
  const desde = searchParams.get('desde') ?? undefined;

  const entries = await generarDesdeGitLog(desde);

  if (entries.length === 0) {
    return success({ mensaje: 'No se encontraron commits nuevos para generar novedades' });
  }

  return success({
    mensaje: `Se generaron ${entries.length} entrada(s) de novedades`,
    entries,
  });
});
