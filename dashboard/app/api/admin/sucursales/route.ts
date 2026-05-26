import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sucursales, tenants } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// ─── GET — Listar sucursales ────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const list = await db
    .select()
    .from(sucursales)
    .where(eq(sucursales.tenantId, DEFAULT_TENANT_ID))
    .orderBy(sucursales.nombre);

  return NextResponse.json(list);
}

// ─── POST — Crear sucursal ──────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: { nombre: string; direccion?: string; telefono?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON requerido' }, { status: 400 });
  }

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }

  const [nueva] = await db
    .insert(sucursales)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      nombre: body.nombre.trim(),
      direccion: body.direccion || null,
      telefono: body.telefono || null,
      email: body.email || null,
    })
    .returning();

  return NextResponse.json(nueva, { status: 201 });
}

// ─── PATCH — Actualizar sucursal ────────────────────────────
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: { id: string; nombre?: string; direccion?: string; telefono?: string; email?: string; activo?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON requerido' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
  if (body.direccion !== undefined) updateData.direccion = body.direccion;
  if (body.telefono !== undefined) updateData.telefono = body.telefono;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.activo !== undefined) updateData.activo = body.activo;
  updateData.updatedAt = sql`now()`;

  const [actualizada] = await db
    .update(sucursales)
    .set(updateData)
    .where(eq(sucursales.id, body.id))
    .returning();

  if (!actualizada) {
    return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });
  }

  return NextResponse.json(actualizada);
}
