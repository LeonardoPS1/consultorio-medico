/**
 * POST /api/pacientes/[id]/consentimiento
 * GET  /api/pacientes/[id]/consentimiento
 *
 * Gestiona los consentimientos informados de un paciente:
 * - POST: Registrar o actualizar un consentimiento (whatsapp, email, datos, terminos)
 * - GET:  Obtener historial de consentimientos
 */

import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth, verifyPacienteAccess } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { z } from 'zod';
import { privacidadService } from '@/lib/services/privacidad';
import { db } from '@/lib/db';
import { pacientes, consentimientoLog } from '@/drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// Schema de validación para registrar consentimiento
const registrarConsentimientoSchema = z.object({
  tipo: z.enum(['whatsapp', 'email', 'datos', 'terminos']),
  accion: z.enum(['grant', 'revoke', 'accept']),
  aceptado: z.boolean(),
});

/**
 * POST - Registrar un evento de consentimiento
 */
export const POST = apiHandler(async (request: NextRequest, { params }) => {
  const session = await requireAuth();
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);

  const body = await parseBody(request, registrarConsentimientoSchema);
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  // Verificar que el paciente existe
  const [paciente] = await db
    .select({ id: pacientes.id })
    .from(pacientes)
    .where(and(eq(pacientes.id, params.id), sql`${pacientes.deletedAt} IS NULL`))
    .limit(1);

  if (!paciente) {
    return success(null, 404);
  }

  const result = await privacidadService.registrarConsentimiento({
    pacienteId: params.id,
    tipo: body.tipo,
    accion: body.accion,
    aceptado: body.aceptado,
    ip,
    userAgent,
  });

  // Actualizar flags de consentimiento en el paciente
  if (body.tipo === 'whatsapp') {
    await db
      .update(pacientes)
      .set({ consentimientoWhatsapp: body.aceptado })
      .where(eq(pacientes.id, params.id));
  } else if (body.tipo === 'email') {
    await db
      .update(pacientes)
      .set({ consentimientoEmail: body.aceptado })
      .where(eq(pacientes.id, params.id));
  }

  return success(result);
});

/**
 * GET - Obtener historial de consentimientos del paciente
 */
export const GET = apiHandler(async (_request: NextRequest, { params }) => {
  const session = await requireAuth();
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;
  await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);

  const historial = await privacidadService.getHistorialConsentimiento(params.id);
  return success(historial);
});
