/**
 * GET /api/v1/medicos — Lista de médicos activos
 *
 * Scope requerido: medicos:read
 * Público: Sí (con API key)
 */

import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { sql } from 'drizzle-orm';
import {
  publicApiHandler,
  jsonResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';

export const GET = publicApiHandler(
  async (request: AuthenticatedRequest) => {
    const result = await db
      .select({
        id: medicos.id,
        nombre: medicos.nombre,
        especialidad: medicos.especialidad,
        email: medicos.email,
        telefono: medicos.telefono,
        whatsapp: medicos.whatsapp,
        matricula: medicos.matricula,
        colorEvento: medicos.colorEvento,
      })
      .from(medicos)
      .where(sql`${medicos.deletedAt} IS NULL`)
      .orderBy(medicos.nombre);

    return jsonResponse({ medicos: result });
  },
  { scopes: [API_SCOPES.MEDICOS_READ] },
);

export { OPTIONS } from '@/lib/public-api-handler';
