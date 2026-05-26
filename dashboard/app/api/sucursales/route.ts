import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sucursales } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// GET — Listar sucursales activas del tenant actual
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const list = await db
    .select({ id: sucursales.id, nombre: sucursales.nombre })
    .from(sucursales)
    .where(eq(sucursales.tenantId, DEFAULT_TENANT_ID))
    .orderBy(sucursales.nombre);

  return NextResponse.json(list);
}
