import { NextRequest } from 'next/server';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { turnos, pacientes } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { canAccess } from '@/lib/features';

/**
 * GET /api/turnos/[id]/score - Obtiene el score de riesgo de inasistencia de un turno
 */
export const GET = apiHandler(async (_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
  const session = await requireAuth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free';

  // Feature gate: scoring-pacientes requiere plan Starter+
  if (!canAccess(plan, 'scoring-pacientes')) {
    return fail('Funcionalidad no disponible en tu plan actual', 403);
  }

  const [turno] = await db
    .select({
      id: turnos.id,
      riskScore: turnos.riskScore,
      riskNivel: turnos.riskNivel,
      riskCalculatedAt: turnos.riskCalculatedAt,
      recordatorio24hEnviado: turnos.recordatorio24hEnviado,
      recordatorio1hEnviado: turnos.recordatorio1hEnviado,
      recordatorio48hEnviado: turnos.recordatorio48hEnviado,
      recordatorio24hLeido: turnos.recordatorio24hLeido,
      recordatorio1hLeido: turnos.recordatorio1hLeido,
      confirmoAsistencia: turnos.confirmoAsistencia,
      pacienteId: turnos.pacienteId,
      fechaHora: turnos.fechaHora,
    })
    .from(turnos)
    .leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))
    .where(
      and(
        eq(turnos.id, id),
        sessionRol !== 'admin' && sessionMedicoId
          ? eq(turnos.medicoId, sessionMedicoId)
          : undefined,
        sql`${turnos.deletedAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!turno) notFound('Turno no encontrado');

  // Si no hay score calculado, devolver nulls
  if (turno.riskScore === null || turno.riskNivel === null) {
    return success({
      risk_score: null,
      risk_nivel: null,
      risk_calculated_at: null,
      factores: {
        recordatorio_24h_enviado: turno.recordatorio24hEnviado,
        recordatorio_1h_enviado: turno.recordatorio1hEnviado,
        recordatorio_48h_enviado: turno.recordatorio48hEnviado,
        recordatorio_24h_leido: turno.recordatorio24hLeido,
        recordatorio_1h_leido: turno.recordatorio1hLeido,
        confirmo_asistencia: turno.confirmoAsistencia,
      },
    });
  }

  return success({
    risk_score: Number(turno.riskScore),
    risk_nivel: turno.riskNivel,
    risk_calculated_at: turno.riskCalculatedAt,
    factores: {
      recordatorio_24h_enviado: turno.recordatorio24hEnviado,
      recordatorio_1h_enviado: turno.recordatorio1hEnviado,
      recordatorio_48h_enviado: turno.recordatorio48hEnviado,
      recordatorio_24h_leido: turno.recordatorio24hLeido,
      recordatorio_1h_leido: turno.recordatorio1hLeido,
      confirmo_asistencia: turno.confirmoAsistencia,
    },
  });
});