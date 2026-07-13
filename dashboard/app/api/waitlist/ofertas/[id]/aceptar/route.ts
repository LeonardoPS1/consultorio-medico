import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { waitlistService } from '@/lib/services/waitlist';
import {
  notificarMedicoReasignacion,
  notificarConfirmacionReasignacion,
} from '@/lib/whatsapp-waitlist';

/**
 * POST /api/waitlist/ofertas/[id]/aceptar - Acepta una oferta de turno
 */
export const POST = apiHandler(
  async (_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const result = await waitlistService.aceptar(id);

    // Notificar al médico y al paciente (fire-and-forget)
    if (result.turno) {
      notificarMedicoReasignacion(result.turno.id).catch(() => {});
      notificarConfirmacionReasignacion(result.turno.id, result.turno.pacienteId).catch(() => {});
    }

    return success(result);
  },
);
