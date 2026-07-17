import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { turnos, horariosAtencion } from '@/drizzle/schema';
import { eq, and, gte, lt, isNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const fecha = request.nextUrl.searchParams.get('fecha');
  const sucursalId = request.nextUrl.searchParams.get('sucursalId');

  if (!fecha) {
    return NextResponse.json({ error: 'fecha es obligatoria' }, { status: 400 });
  }

  const targetDate = new Date(fecha + 'T00:00:00');
  const dayOfWeek = targetDate.getDay();

  const horariosFiltro = [eq(horariosAtencion.dia, String(dayOfWeek)), eq(horariosAtencion.activo, true)];
  if (sucursalId) horariosFiltro.push(eq(horariosAtencion.sucursalId, sucursalId));

  const slots = await db
    .select({
      horaInicio: horariosAtencion.inicio,
      horaFin: horariosAtencion.fin,
      sucursalId: horariosAtencion.sucursalId,
      tipo: horariosAtencion.tipo,
    })
    .from(horariosAtencion)
    .where(and(...horariosFiltro));

  const occupied = await db
    .select({ fechaHora: turnos.fechaHora })
    .from(turnos)
    .where(
      and(
        gte(turnos.fechaHora, targetDate),
        lt(turnos.fechaHora, new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)),
        isNull(turnos.deletedAt),
      ),
    );

  const occupiedTimes = new Set(occupied.map((o) => o.fechaHora.toISOString()));

  const disponibles = [];
  for (const slot of slots) {
    const hInicio = parseInt(slot.horaInicio.split(':')[0]);
    const hFin = parseInt(slot.horaFin.split(':')[0]);

    for (let h = hInicio; h < hFin; h++) {
      const horaStr = `${String(h).padStart(2, '0')}:00`;
      const slotDate = new Date(`${fecha}T${horaStr}:00`);
      if (!occupiedTimes.has(slotDate.toISOString())) {
        disponibles.push({
          fecha,
          hora: horaStr,
          sucursalId: slot.sucursalId,
          tipo: slot.tipo,
        });
      }
    }
  }

  return NextResponse.json(disponibles);
}
