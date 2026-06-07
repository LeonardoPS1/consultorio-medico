import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comunas } from '@/drizzle/schema';
import { eq, asc } from 'drizzle-orm';
import { cache } from '@/lib/cache';

// Datos estáticos (cambian una vez por década) — cache de 24hs
export const revalidate = 86400;

const CACHE_TTL = 86_400_000; // 24hs

/**
 * GET /api/comunas?region_id=xxx
 * Devuelve las comunas de una región, ordenadas por nombre
 */
export async function GET(request: NextRequest) {
  try {
    const regionId = request.nextUrl.searchParams.get('region_id');

    if (!regionId) {
      return NextResponse.json({ error: 'region_id es requerido' }, { status: 400 });
    }

    const data = await cache.getOrSet(`comunas:region:${regionId}`, async () => {
      return await db
        .select({ id: comunas.id, nombre: comunas.nombre })
        .from(comunas)
        .where(eq(comunas.regionId, regionId))
        .orderBy(asc(comunas.nombre));
    }, CACHE_TTL);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Comunas API] Error:', error);
    return NextResponse.json({ error: 'Error al obtener comunas' }, { status: 500 });
  }
}
