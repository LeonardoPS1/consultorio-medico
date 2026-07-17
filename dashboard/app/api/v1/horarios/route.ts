import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { horariosAtencion } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const medicoId = request.nextUrl.searchParams.get('sucursalId');
  const filters = [eq(horariosAtencion.activo, true)];
  if (medicoId) filters.push(eq(horariosAtencion.sucursalId, medicoId));

  const result = await db
    .select({ dia: horariosAtencion.dia, horaInicio: horariosAtencion.inicio, horaFin: horariosAtencion.fin })
    .from(horariosAtencion)
    .where(and(...filters));

  return NextResponse.json(result);
}
