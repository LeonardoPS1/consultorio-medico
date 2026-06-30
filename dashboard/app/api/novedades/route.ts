import { NextRequest } from 'next/server';
import { apiHandler, success, created, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { listarNovedades, crearNovedad, importarChangelogEstatico, type CreateNovedadInput } from '@/lib/services/novedades';

export const dynamic = 'force-dynamic';

// ─── GET /api/novedades ──────────────────────────────────
// Query params: ?limit=5 (opcional, si no va trae todas)
export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  let entries = await listarNovedades(limit);

  // Auto-importar el CHANGELOG estático a la DB si está vacía
  if (entries.length === 0) {
    try {
      const importadas = await importarChangelogEstatico();
      if (importadas > 0) {
        entries = await listarNovedades(limit);
      }
    } catch (err) {
      console.error('[API Novedades] Error al importar CHANGELOG:', err);
    }
  }

  return success(entries);
});

// ─── POST /api/novedades ─────────────────────────────────
// Crea una entrada de novedades manualmente (solo admin)
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  if (session.user.role !== 'admin') {
    return fail('Solo administradores pueden crear novedades', 403);
  }

  const body = await request.json() as CreateNovedadInput;

  if (!body.version || !body.titulo || !body.items?.length) {
    return fail('Faltan campos requeridos: version, titulo, items');
  }

  const entry = await crearNovedad({
    version: body.version,
    titulo: body.titulo,
    items: body.items,
    fecha: body.fecha ? new Date(body.fecha) : undefined,
    tipo: body.tipo ?? 'feature',
  });

  return created(entry);
});
