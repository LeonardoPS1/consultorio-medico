import { eq, and, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { notasSoap, pacientes, medicos } from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { transcripcionService } from '@/lib/services/transcripcion';

/**
 *
 * @param _request
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const list = await db
      .select({
        id: notasSoap.id,
        pacienteId: notasSoap.pacienteId,
        medicoId: notasSoap.medicoId,
        turnoId: notasSoap.turnoId,
        subjetivo: notasSoap.subjetivo,
        objetivo: notasSoap.objetivo,
        assessment: notasSoap.assessment,
        plan: notasSoap.plan,
        iaGenerated: notasSoap.iaGenerated,
        estadoRevision: notasSoap.estadoRevision,
        createdAt: notasSoap.createdAt,
        pacienteNombre: pacientes.nombre,
        pacienteApellido: pacientes.apellido,
        medicoNombre: medicos.nombre,
      })
      .from(notasSoap)
      .leftJoin(pacientes, eq(notasSoap.pacienteId, pacientes.id))
      .leftJoin(medicos, eq(notasSoap.medicoId, medicos.id))
      .where(
        and(
          eq(notasSoap.iaGenerated, true),
          eq(notasSoap.estadoRevision, 'pendiente'),
        ),
      )
      .orderBy(desc(notasSoap.createdAt));

    return NextResponse.json(list);
  } catch (error) {
    console.error('[API] Error GET revision SOAP:', error);
    return NextResponse.json({ error: 'Error al obtener notas pendientes' }, { status: 500 });
  }
}

/**
 *
 * @param request
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json() as { notaId?: string; accion?: string };
    const { notaId, accion } = body;

    if (!notaId || !accion || !['aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'notaId y accion (aprobar|rechazar) son requeridos' }, { status: 400 });
    }

    let success = false;
    if (accion === 'aprobar') {
      success = await transcripcionService.aprobarNota(notaId);
    } else {
      success = await transcripcionService.rechazarNota(notaId);
    }

    if (!success) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, accion });
  } catch (error) {
    console.error('[API] Error PATCH revision SOAP:', error);
    return NextResponse.json({ error: 'Error al revisar nota' }, { status: 500 });
  }
}
