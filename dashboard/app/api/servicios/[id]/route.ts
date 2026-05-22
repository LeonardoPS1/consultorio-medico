import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { servicios } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [servicio] = await db.select().from(servicios).where(eq(servicios.id, params.id));
    if (!servicio) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    return NextResponse.json({ data: servicio });
  } catch {
    return NextResponse.json({ error: 'Error al obtener servicio' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Envia al menos un campo' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.duracionMinutos !== undefined) updateData.duracionMinutos = body.duracionMinutos;
    if (body.precio !== undefined) updateData.precio = body.precio;
    if (body.activo !== undefined) updateData.activo = body.activo;

    const [actualizado] = await db.update(servicios).set(updateData).where(eq(servicios.id, params.id)).returning();
    if (!actualizado) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });

    return NextResponse.json({ data: actualizado });
  } catch (error) {
    console.error('[API] Error PATCH /api/servicios:', error);
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
  }
}
