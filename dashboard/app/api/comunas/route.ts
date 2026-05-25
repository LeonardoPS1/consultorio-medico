import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comunas } from '@/drizzle/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

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

    const data = await db
      .select({ id: comunas.id, nombre: comunas.nombre })
      .from(comunas)
      .where(eq(comunas.regionId, regionId))
      .orderBy(asc(comunas.nombre));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Comunas API] Error:', error);
    return NextResponse.json({ error: 'Error al obtener comunas' }, { status: 500 });
  }
}
