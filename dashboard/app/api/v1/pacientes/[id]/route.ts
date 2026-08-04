import { eq, isNull, and } from 'drizzle-orm';
import { pacientes } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { API_SCOPES } from '@/lib/public-api-auth';
import {
  publicApiHandler,
  jsonResponse,
  errorResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';

async function handler(
  request: AuthenticatedRequest,
  context?: { params: Record<string, string> },
) {
  const id = context?.params?.id;

  if (!id) {
    return errorResponse('ID de paciente requerido', 400);
  }

  const [paciente] = await db
    .select({
      id: pacientes.id,
      nombre: pacientes.nombre,
      apellido: pacientes.apellido,
      email: pacientes.email,
      telefono: pacientes.telefono,
    })
    .from(pacientes)
    .where(and(eq(pacientes.id, id), isNull(pacientes.deletedAt)))
    .limit(1);

  if (!paciente) {
    return errorResponse('Paciente no encontrado', 404);
  }

  return jsonResponse(paciente);
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.PACIENTES_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
