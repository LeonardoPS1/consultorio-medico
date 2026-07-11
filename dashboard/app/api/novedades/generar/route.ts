import { NextRequest } from 'next/server';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { generarDesdeGitLog, generarDesdeCommits } from '@/lib/services/novedades';

export const dynamic = 'force-dynamic';

interface GitCommit {
  message: string;
}

interface GitHubPushPayload {
  ref?: string;
  commits?: GitCommit[];
  head_commit?: GitCommit;
}

function extraerCommits(body: unknown): string[] {
  if (Array.isArray(body)) {
    return (body as GitCommit[]).map((c) => c.message).filter(Boolean);
  }

  const payload = body as GitHubPushPayload;

  if (payload.commits && Array.isArray(payload.commits)) {
    return payload.commits.map((c) => c.message).filter(Boolean);
  }

  if (payload.head_commit?.message) {
    return [payload.head_commit.message];
  }

  return [];
}

// ─── POST /api/novedades/generar ─────────────────────────
// Genera entradas de novedades desde commits
// Body opcional: array de { message } o GitHub push payload
// Si no hay body, lee git log (solo en dev, falla en producción)
// Auth: session admin O x-internal-key (para n8n)
export const POST = apiHandler(async (request: NextRequest) => {
  const internalKey = request.headers.get('x-internal-key');
  const expectedKey = process.env.NOVEDADES_INTERNAL_KEY;

  if (internalKey !== expectedKey) {
    const session = await requireAuth();
    if (session.user.role !== 'admin') {
      return fail('Solo administradores pueden generar novedades', 403);
    }
  }

  // Intentar leer body primero (producción, desde n8n)
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    body = null;
  }

  if (body) {
    const messages = extraerCommits(body);
    if (messages.length > 0) {
      const entries = await generarDesdeCommits(messages);
      if (entries.length === 0) {
        return success({ mensaje: 'No se generaron entradas (solo commits sin clasificar)' });
      }
      return success({
        mensaje: `Se generaron ${entries.length} entrada(s) de novedades`,
        entries,
      });
    }
  }

  // Fallback a git log (solo funciona en dev con .git disponible)
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
