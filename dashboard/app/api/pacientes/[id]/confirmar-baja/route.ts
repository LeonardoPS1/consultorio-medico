/**
 * POST /api/pacientes/[id]/confirmar-baja
 *
 * Confirma y ejecuta la baja definitiva de datos del paciente:
 * - Cascade soft-delete en tablas relacionadas
 * - Anonimización de datos PII
 * - Soft-delete del paciente
 * - Notificación a n8n para limpieza de chat memory
 *
 * ⚠️ Esta operación es irreversible. Los datos se anonimizan permanentemente.
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

  const result = await privacidadService.confirmarBaja(id, ip, userAgent);
  return success(result);
});
