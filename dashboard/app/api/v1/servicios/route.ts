/**
 * GET /api/v1/servicios — Servicios/prestaciones disponibles
 *
 * Scope requerido: servicios:read
 * Público: Sí (con API key)
 */

import { db } from '@/lib/db';
import { servicios } from '@/drizzle/schema';
import { sql, asc } from 'drizzle-orm';
import {
  publicApiHandler,
  jsonResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';

export const GET = publicApiHandler(
  async (_request: AuthenticatedRequest) => {
    const result = await db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        descripcion: servicios.descripcion,
        duracionMinutos: servicios.duracionMinutos,
        precio: servicios.precio,
      })
      .from(servicios)
      .where(sql`${servicios.deletedAt} IS NULL`)
      .orderBy(asc(servicios.nombre));

    return jsonResponse({ servicios: result });
  },
  { scopes: [API_SCOPES.SERVICIOS_READ] },
);

export { OPTIONS } from '@/lib/public-api-handler';
