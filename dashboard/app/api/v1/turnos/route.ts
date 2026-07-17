import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pacienteId, medicoId, fecha, hora, motivo, tipo } = body;

  if (!pacienteId || !medicoId || !fecha || !hora) {
    return NextResponse.json({ error: 'Faltan campos obligatorios: pacienteId, medicoId, fecha, hora' }, { status: 400 });
  }

  const fechaHora = new Date(`${fecha}T${hora}:00`);

  const { db } = await import('@/lib/db');
  const { turnos } = await import('@/drizzle/schema');
  const { eq, and, gte, lt, isNull } = await import('drizzle-orm');

  const conflicto = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.medicoId, medicoId),
        gte(turnos.fechaHora, fechaHora),
        lt(turnos.fechaHora, new Date(fechaHora.getTime() + 60 * 60 * 1000)),
        isNull(turnos.deletedAt),
      ),
    )
    .limit(1);

  if (conflicto.length > 0) {
    return NextResponse.json({ error: 'El horario no está disponible' }, { status: 409 });
  }

  const turnoTipo = tipo === 'telemedicina' ? 'telemedicina' : 'consulta';

  const turno = await db
    .insert(turnos)
    .values({
      pacienteId,
      medicoId,
      fechaHora,
      motivo: motivo || null,
      tipoConsulta: turnoTipo as 'consulta' | 'telemedicina',
      estado: 'pendiente' as const,
      duracionMinutos: 30,
    })
    .returning();

  return NextResponse.json(turno[0], { status: 201 });
}
