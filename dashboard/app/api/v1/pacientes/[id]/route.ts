/**
 * GET /api/v1/pacientes/:id — Información de un paciente
 *
 * Scope requerido: pacientes:read
 * Público: Sí (con API key)
 * Nota: solo devuelve datos no sensibles.
 */

import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { publicApiHandler, jsonResponse, errorResponse, type AuthenticatedRequest } from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';

async function handler(request: AuthenticatedRequest, context?: { params: Record<string, string> }) {
  const pacienteId = context?.params?.id;

  if (!pacienteId) {
    return errorResponse('ID de paciente requerido', 400);
  }

  const result = await db
    .select()
    .from(pacientes)
    .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
    .limit(1);

  if (result.length === 0) {
    return errorResponse('Paciente no encontrado', 404);
  }

  const p = result[0];

  // Devolver solo datos no sensibles
  return jsonResponse({
    paciente: {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      telefono: p.telefono,
      fechaNacimiento: p.fechaNacimiento,
      obraSocial: p.obraSocial,
      consentimientoWhatsapp: p.consentimientoWhatsapp,
      consentimientoEmail: p.consentimientoEmail,
    },
  });
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.PACIENTES_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
