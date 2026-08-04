import { eq, and } from 'drizzle-orm';
import { horariosAtencion } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { API_SCOPES } from '@/lib/public-api-auth';
import {
  publicApiHandler,
  jsonResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';

async function handler(request: AuthenticatedRequest) {
  const medicoId = request.nextUrl.searchParams.get('medicoId');
  const filters = [eq(horariosAtencion.activo, true)];
  if (medicoId) filters.push(eq(horariosAtencion.sucursalId, medicoId));

  const result = await db
    .select({
      dia: horariosAtencion.dia,
      horaInicio: horariosAtencion.inicio,
      horaFin: horariosAtencion.fin,
    })
    .from(horariosAtencion)
    .where(and(...filters));

  return jsonResponse(result);
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.HORARIOS_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
