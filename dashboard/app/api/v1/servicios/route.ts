import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { servicios } from '@/drizzle/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await db
    .select({ id: servicios.id, nombre: servicios.nombre, duracionMinutos: servicios.duracionMinutos, precio: servicios.precio })
    .from(servicios);

  return NextResponse.json(result);
}
