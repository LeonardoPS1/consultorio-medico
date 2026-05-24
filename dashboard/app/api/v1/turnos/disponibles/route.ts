/**
 * GET /api/v1/turnos/disponibles — Slots disponibles
 *
 * Query params: fecha (YYYY-MM-DD), medicoId (opcional)
 * Scope requerido: turnos:read
 * Público: Sí (con API key)
 */

import { db } from '@/lib/db';
import { turnos, medicos } from '@/drizzle/schema';
import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { publicApiHandler, jsonResponse, errorResponse, type AuthenticatedRequest } from '@/lib/public-api-handler';
import { API_SCOPES } from '@/lib/public-api-auth';

export const GET = publicApiHandler(
  async (request: AuthenticatedRequest) => {
    const { searchParams } = new URL(request.url);
    const fechaStr = searchParams.get('fecha');
    const medicoId = searchParams.get('medicoId');

    if (!fechaStr) {
      return errorResponse('Parámetro requerido: fecha (YYYY-MM-DD)', 400);
    }

    // Validar formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      return errorResponse('Formato de fecha inválido. Usar YYYY-MM-DD', 400);
    }

    // Construir condiciones base
    const fechaInicio = `${fechaStr}T00:00:00Z`;
    const fechaFin = `${fechaStr}T23:59:59Z`;

    const conditions = [
      gte(turnos.fechaHora, new Date(fechaInicio)),
      lte(turnos.fechaHora, new Date(fechaFin)),
      sql`${turnos.deletedAt} IS NULL`,
    ];

    if (medicoId) {
      conditions.push(eq(turnos.medicoId, medicoId));
    }

    // Obtener médicos activos (para ofrecer filtro)
    const medicosList = await db
      .select({
        id: medicos.id,
        nombre: medicos.nombre,
        especialidad: medicos.especialidad,
        colorEvento: medicos.colorEvento,
      })
      .from(medicos)
      .where(sql`${medicos.deletedAt} IS NULL`);

    // Obtener turnos ocupados en esa fecha
    const turnosOcupados = await db
      .select({
        id: turnos.id,
        medicoId: turnos.medicoId,
        fechaHora: turnos.fechaHora,
        duracionMinutos: turnos.duracionMinutos,
        estado: turnos.estado,
      })
      .from(turnos)
      .where(and(...conditions, sql`${turnos.estado} IN ('pendiente', 'confirmada', 'en_atencion')`))
      .orderBy(turnos.fechaHora);

    return jsonResponse({
      fecha: fechaStr,
      medicos: medicosList,
      turnosOcupados,
    });
  },
  { scopes: [API_SCOPES.TURNOS_READ] },
);

export { OPTIONS } from '@/lib/public-api-handler';
