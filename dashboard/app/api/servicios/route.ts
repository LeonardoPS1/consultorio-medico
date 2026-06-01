import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { servicios } from '@/drizzle/schema';
import { eq, sql, count } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const lista = await db.select().from(servicios).where(sql`${servicios.deletedAt} IS NULL`).orderBy(servicios.nombre);
    const [{ total }] = await db.select({ total: count() }).from(servicios).where(sql`${servicios.deletedAt} IS NULL`);
    return NextResponse.json({ data: lista, total: Number(total) });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, descripcion, duracionMinutos, precio, medicoId } = body;
    if (!nombre?.trim()) return NextResponse.json({ error: 'nombre es obligatorio' }, { status: 400 });

    const [nuevo] = await db.insert(servicios).values({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      duracionMinutos: duracionMinutos || 30,
      precio: precio || null,
      medicoId: medicoId || null,
      activo: true,
    }).returning();

    return NextResponse.json({ data: nuevo }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/servicios:', error);
    return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 });
  }
}
