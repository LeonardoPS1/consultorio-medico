import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { plantillasMensajes } from '@/drizzle/schema';
import { eq, isNull } from 'drizzle-orm';

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
      .orderBy(plantillasMensajes.categoria, plantillasMensajes.nombre);

    const formatted = plantillas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      contenido: p.contenido,
      categoria: p.categoria,
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
    const { nombre, contenido, categoria, variables } = body;

    if (!nombre || !contenido) {
      return NextResponse.json({ error: 'Nombre y contenido son requeridos' }, { status: 400 });
    }

    const [nueva] = await db
      .insert(plantillasMensajes)
      .values({
        nombre,
        contenido,
        categoria: categoria || 'recordatorios',
        variables: variables || [],
      })
      .returning();

    return NextResponse.json({
      data: {
        id: nueva.id,
        nombre: nueva.nombre,
        contenido: nueva.contenido,
        categoria: nueva.categoria,
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
    const { id, nombre, contenido, categoria, variables } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (nombre !== undefined) updateData.nombre = nombre;
    if (contenido !== undefined) updateData.contenido = contenido;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (variables !== undefined) updateData.variables = variables;

    await db
      .update(plantillasMensajes)
      .set(updateData)
      .where(eq(plantillasMensajes.id, id));

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
