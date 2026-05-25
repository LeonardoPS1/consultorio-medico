import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { regiones } from '@/drizzle/schema';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regiones
 * Devuelve todas las regiones de Chile ordenadas por nombre
 */
export async function GET() {
  try {
    const data = await db
      .select({ id: regiones.id, nombre: regiones.nombre, numeroRomano: regiones.numeroRomano })
      .from(regiones)
      .orderBy(asc(regiones.nombre));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Regiones API] Error:', error);
    return NextResponse.json({ error: 'Error al obtener regiones' }, { status: 500 });
  }
}
