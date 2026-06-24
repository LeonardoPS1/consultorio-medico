import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { regiones } from '@/drizzle/schema';
import { asc } from 'drizzle-orm';
import { cache } from '@/lib/cache';

// Datos estáticos (cambian una vez por década) — cache de 24hs
export const revalidate = 86400;

const CACHE_KEY = 'regiones:todas';
const CACHE_TTL = 86_400_000; // 24hs

/**
 * GET /api/regiones
 * Devuelve todas las regiones de Chile ordenadas por nombre
 */
export async function GET() {
  try {
    const data = await cache.getOrSet(
      CACHE_KEY,
      async () => {
        return await db
          .select({ id: regiones.id, nombre: regiones.nombre, numeroRomano: regiones.numeroRomano })
          .from(regiones)
          .orderBy(asc(regiones.nombre));
      },
      CACHE_TTL,
    );

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Regiones API] Error:', error);
    return NextResponse.json({ error: 'Error al obtener regiones' }, { status: 500 });
  }
}
