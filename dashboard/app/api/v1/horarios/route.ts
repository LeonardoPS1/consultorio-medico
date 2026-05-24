/**
 * GET /api/v1/horarios — Horarios de atención
 *
 * Scope requerido: horarios:read
 * Público: Sí (con API key)
 */

import { db } from '@/lib/db';
import { horariosAtencion } from '@/drizzle/schema';
import { asc } from 'drizzle-orm';
import { publicApiHandler, jsonResponse, type AuthenticatedRequest } from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';

export const GET = publicApiHandler(
  async (_request: AuthenticatedRequest) => {
    const result = await db
      .select()
      .from(horariosAtencion)
      .orderBy(asc(horariosAtencion.dia));

    return jsonResponse({ horarios: result });
  },
  { scopes: [API_SCOPES.HORARIOS_READ] },
);

export { OPTIONS } from '@/lib/public-api-handler';
