import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recetas } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * PATCH /api/recetas/[id]
 *
 * Actualiza una receta (cambiar estado, renovar, etc.)
 *
 * Body (JSON): campos a actualizar
 * - estado: 'activa' | 'vencida' | 'historial'
 * - medicamento, dosis, frecuencia, duracion, indicaciones, etc.
 *
 * GET /api/recetas/[id]
 *
 * Obtiene una receta por ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const [receta] = await db
      .select()
      .from(recetas)
      .where(and(eq(recetas.id, params.id)));

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

    // Si se cambia a 'activa' desde otro estado (renovar), actualizar fechas
    const updateData: Record<string, any> = { ...body, updatedAt: new Date() };
    if (body.estado === 'activa' && existente[0]) {
      updateData.fechaInicio = new Date().toISOString().split('T')[0];
      updateData.fechaFin = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .split('T')[0];
    }

    const [actualizada] = await db
      .update(recetas)
      .set(updateData)
      .where(eq(recetas.id, params.id))
      .returning();

    return NextResponse.json({ data: actualizada });
  } catch (error) {
    console.error('[API] Error PATCH /api/recetas/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar receta' },
      { status: 500 },
    );
  }
}
