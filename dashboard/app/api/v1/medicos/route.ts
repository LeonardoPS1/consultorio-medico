import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db
    .select({ id: medicos.id, nombre: medicos.nombre, especialidad: medicos.especialidad, email: medicos.email, telefono: medicos.telefono })
    .from(medicos)
    .where(isNull(medicos.deletedAt));

  return NextResponse.json(result);
}
