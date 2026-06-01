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

export const POST = apiHandler(async (request: NextRequest, { params }) => {
  const session = await requireAuth();
  const sessionMedicoId = (session.user as any)?.medicoId;
  const sessionRol = (session.user as any)?.role;
  await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  const result = await privacidadService.solicitarBaja(params.id, ip, userAgent);
  return success(result);
});
