/**
 * PATCH /api/portal/perfil — Actualizar datos del perfil
 * Protegido: requiere cookie portal_session
 * Permite editar: email, sistemaSalud, regionId, comunaId, consentimientos
 */

import { NextRequest } from 'next/server';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { getPortalSession, validateCSRFOrigin } from '@/lib/portal-auth';
import { parseBody, updatePortalPerfilSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export const PATCH = apiHandler(async (request: NextRequest) => {
  if (!validateCSRFOrigin(request)) {
    fail('Origen no válido', 403);
  }

  const session = await getPortalSession();
  if (!session) {
    fail('No autorizado', 401);
  }

  const body = await parseBody(request, updatePortalPerfilSchema);

  const updates: Record<string, unknown> = {};

  if (body.email !== undefined && body.email !== null) updates.email = body.email;
  if (body.consentimientoWhatsapp !== undefined && body.consentimientoWhatsapp !== null)
    updates.consentimientoWhatsapp = body.consentimientoWhatsapp;
  if (body.consentimientoEmail !== undefined && body.consentimientoEmail !== null)
    updates.consentimientoEmail = body.consentimientoEmail;
  if (body.sistemaSalud !== undefined && body.sistemaSalud !== null)
    updates.sistemaSalud = body.sistemaSalud;
  if (body.regionId !== undefined && body.regionId !== null) updates.regionId = body.regionId;
  if (body.comunaId !== undefined && body.comunaId !== null) updates.comunaId = body.comunaId;

  if (Object.keys(updates).length === 0) {
    fail('Sin campos para actualizar', 400);
  }

  await db.update(pacientes).set(updates).where(eq(pacientes.id, session.pacienteId));

  return ok({ success: true });
});
