import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recetas } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { recetasService } from '@/lib/services/recetas';

/**
 * GET /api/recetas/[id]
 *
 * Obtiene una receta por ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const receta = await recetasService.obtener(params.id);

    if (!receta) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: receta });
  } catch (error) {
    console.error('[API] Error GET /api/recetas/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener receta' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/recetas/[id]
 *
 * Actualiza una receta existente.
 * Regenera hash de verificación si cambian datos sensibles.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'Enviá al menos un campo para actualizar' },
        { status: 400 },
      );
    }

    // Verificar que la receta existe
    const existente = await db
      .select({ id: recetas.id })
      .from(recetas)
      .where(eq(recetas.id, params.id))
      .limit(1);

    if (existente.length === 0) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 },
      );
    }

    const actualizada = await recetasService.actualizar(params.id, body);

    return NextResponse.json({ data: actualizada });
  } catch (error) {
    console.error('[API] Error PATCH /api/recetas/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar receta' },
      { status: 500 },
    );
  }
}
