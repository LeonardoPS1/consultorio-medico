import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { plantillasMensajes, plantillaTipoEnum, plantillaEstadoEnum } from '@/drizzle/schema';
import { eq, isNull } from 'drizzle-orm';

const NUEVAS_CATEGORIAS = [
  'recordatorio',
  'confirmacion',
  'cancelacion',
  'resultado',
  'receta',
  'certificado',
  'otro',
] as const;

const createPlantillaSchema = z.object({
  nombre: z.string().min(1).max(100),
  contenido: z.string().min(1).max(10000),
  tipo: z.enum(NUEVAS_CATEGORIAS).default('recordatorio'),
  variables: z.array(z.string()).optional().default([]),
});

const updatePlantillaSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1).max(100).optional(),
  contenido: z.string().min(1).max(10000).optional(),
  tipo: z.enum(NUEVAS_CATEGORIAS).optional(),
  variables: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const plantillas = await db
      .select()
      .from(plantillasMensajes)
      .where(isNull(plantillasMensajes.deletedAt))
      .orderBy(plantillasMensajes.tipo, plantillasMensajes.nombre);

    const formatted = plantillas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      contenido: p.contenido,
      tipo: p.tipo,
      estado: p.estado,
      variables: p.variables || [],
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('[Plantillas GET]', error);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPlantillaSchema.parse(body);

const [nueva] = await db.insert(plantillasMensajes).values({
      nombre: parsed.nombre,
      contenido: parsed.contenido,
      tipo: parsed.tipo,
      variables: parsed.variables,
      estado: plantillaEstadoEnum.enumValues[0],
    }).returning();

    return NextResponse.json({
      data: {
        id: nueva.id,
        nombre: nueva.nombre,
        contenido: nueva.contenido,
        tipo: nueva.tipo,
        estado: nueva.estado,
        variables: nueva.variables || [],
      },
    });
  } catch (error) {
    console.error('[Plantillas POST]', error);
    return NextResponse.json({ error: 'Error al crear plantilla' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updatePlantillaSchema.parse(body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.nombre !== undefined) updateData.nombre = parsed.nombre;
    if (parsed.contenido !== undefined) updateData.contenido = parsed.contenido;
    if (parsed.tipo !== undefined) updateData.tipo = parsed.tipo;
    if (parsed.variables !== undefined) updateData.variables = parsed.variables;
    const id = parsed.id;

    await db.update(plantillasMensajes).set(updateData).where(eq(plantillasMensajes.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Plantillas PATCH]', error);
    return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Soft delete
    await db
      .update(plantillasMensajes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(plantillasMensajes.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Plantillas DELETE]', error);
    return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 });
  }
}
