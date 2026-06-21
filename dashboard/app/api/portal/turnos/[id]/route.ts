/**
 * PATCH /api/portal/turnos/[id] — Cancelar turno + reembolso si aplica
 * Protegido: requiere cookie portal_session
 */

import { NextRequest } from 'next/server';
import { apiHandler, ok, fail, notFound } from '@/lib/api-handler';
import { getPortalSession } from '@/lib/portal-auth';
import { parseBody, portalTurnoUpdateSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { turnos } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  const session = await getPortalSession();
  if (!session) fail('No autorizado', 401);

  const turnoId = params.id;
  const body = await parseBody(request, portalTurnoUpdateSchema);

  const nuevoEstado = body.estado || 'cancelada';

  if (!['cancelada'].includes(nuevoEstado)) {
    fail('Solo se permite cancelar turnos', 403);
  }

  const [turno] = await db
    .select({ id: turnos.id, estado: turnos.estado, fechaHora: turnos.fechaHora, pagado: turnos.pagado })
    .from(turnos)
    .where(and(eq(turnos.id, turnoId), eq(turnos.pacienteId, session.pacienteId)))
    .limit(1);

  if (!turno) notFound('Turno no encontrado');

  if (turno.estado === 'cancelada') {
    fail('El turno ya fue cancelado', 400);
  }

  if (turno.estado === 'atendido') {
    fail('No se puede cancelar un turno ya atendido', 400);
  }

  const motivo = body.motivo || 'Cancelado por el paciente';

  await db
    .update(turnos)
    .set({
      estado: 'cancelada',
      canceladoPor: session.pacienteId,
      motivoCancelacion: motivo,
    })
    .where(eq(turnos.id, turnoId));

  // ─── Reembolso si el turno estaba pagado ────────────────
  let reembolso = null;
  if (turno.pagado && turno.fechaHora) {
    try {
      const { calcularReembolso, getRefundPolicy, procesarReembolso } = await import('@/lib/services/portal-reembolsos');
      const policy = getRefundPolicy();
      const refundCalc = calcularReembolso(turno.fechaHora, -1, policy); // monto se obtiene aparte

      // Necesitamos el monto real del pago
      const { portalPagos } = await import('@/drizzle/schema');
      const [pago] = await db
        .select({ monto: portalPagos.monto })
        .from(portalPagos)
        .where(and(eq(portalPagos.turnoId, turnoId), eq(portalPagos.pacienteId, session.pacienteId)))
        .limit(1);

      if (pago) {
        const montoPagado = Number(pago.monto);
        const refundFinal = calcularReembolso(turno.fechaHora, montoPagado, policy);

        if (refundFinal.eligible && refundFinal.montoReembolso > 0) {
          const result = await procesarReembolso(turnoId, session.pacienteId, refundFinal);
          reembolso = {
            tipo: refundFinal.tipo,
            monto: refundFinal.montoReembolso,
            mensaje: refundFinal.mensaje,
            procesado: result.success,
            error: result.error || null,
          };
        } else {
          reembolso = {
            tipo: refundFinal.tipo,
            monto: 0,
            mensaje: refundFinal.mensaje,
            procesado: false,
            error: null,
          };
        }
      }
    } catch (e) {
      reembolso = {
        tipo: 'ninguno',
        monto: 0,
        mensaje: 'Error al procesar reembolso',
        procesado: false,
        error: e instanceof Error ? e.message : 'Error interno',
      };
    }
  }

  return ok({ success: true, estado: 'cancelada', reembolso });
});
