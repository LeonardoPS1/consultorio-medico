/**
 * POST /api/portal/encuestas/responder — Responder encuesta desde portal
 * Body: { turnoId, puntaje, comentario? }
 * Protegido: requiere cookie portal_session
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalSession } from '@/lib/portal-auth';
import { db } from '@/lib/db';
import { turnos, historialMedico } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { analyzeSentiment } from '@/lib/encuestas';
import { safeLog, safeError } from '@/lib/logger';

const encuestaSchema = z.object({
  turnoId: z.string().uuid(),
  puntaje: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = encuestaSchema.parse(body);

    // Verificar que el turno pertenece al paciente
    const [turno] = await db
      .select({
        id: turnos.id,
        pacienteId: turnos.pacienteId,
        medicoId: turnos.medicoId,
      })
      .from(turnos)
      .where(and(eq(turnos.id, parsed.turnoId), eq(turnos.pacienteId, session.pacienteId)))
      .limit(1);

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Verificar si ya existe encuesta para este turno
    const [existing] = await db
      .select({ id: historialMedico.id })
      .from(historialMedico)
      .where(
        and(
          eq(historialMedico.turnoId, parsed.turnoId),
          eq(historialMedico.tipo, 'encuesta'),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una encuesta para este turno' }, { status: 400 });
    }

    // Analizar sentimiento si hay comentario
    let archivos: Record<string, unknown> = {};
    if (parsed.comentario && parsed.comentario.trim().length >= 3) {
      const sentimiento = await analyzeSentiment(parsed.comentario);
      if (sentimiento) {
        archivos.sentimiento = sentimiento.sentimiento;
        archivos.sentimientoScore = sentimiento.score;
      }
    }

    await db.insert(historialMedico).values({
      pacienteId: session.pacienteId,
      medicoId: turno.medicoId,
      turnoId: parsed.turnoId,
      tipo: 'encuesta',
      titulo: `Encuesta de satisfacción - ${parsed.puntaje}/5`,
      descripcion: parsed.comentario || 'Sin comentarios',
      visibleParaPaciente: false,
      archivos: archivos as any,
    });

    safeLog(`[PortalEncuestas] ✅ Respuesta guardada: paciente ${session.pacienteId}, turno ${parsed.turnoId}, puntaje ${parsed.puntaje}`);

    return NextResponse.json({
      success: true,
      data: { turnoId: parsed.turnoId, puntaje: parsed.puntaje, registrada: new Date().toISOString() },
    }, { status: 201 });
  } catch (error) {
    safeError('[PortalEncuestas] Error al guardar respuesta:', error instanceof Error ? { message: error.message } : error);
    return NextResponse.json({ error: 'Error al registrar encuesta' }, { status: 500 });
  }
}