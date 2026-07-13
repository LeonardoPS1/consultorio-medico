/**
 * POST /api/pacientes/[id]/solicitar-baja
 *
 * Inicia el proceso de solicitud de baja de datos (ARCO - Cancelación/Supresión).
 * Registra la solicitud en consentimiento_log y auditoria_accesos.
 *
 * El paciente/médico puede luego confirmar la baja con:
 *   POST /api/pacientes/[id]/confirmar-baja
 */

import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth, verifyPacienteAccess } from '@/lib/api-auth';
import { privacidadService } from '@/lib/services/privacidad';

export const POST = apiHandler(async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
  const session = await requireAuth();
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  await verifyPacienteAccess(id, sessionMedicoId, sessionRol);

  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  const result = await privacidadService.solicitarBaja(id, ip, userAgent);
  return success(result);
});
