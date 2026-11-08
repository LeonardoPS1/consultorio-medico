import { and, eq, or, sql } from 'drizzle-orm';
import { horariosAtencion, medicos, sucursales } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { API_SCOPES } from '@/lib/public-api-auth';
import {
  publicApiHandler,
  jsonResponse,
  errorResponse,
  type AuthenticatedRequest,
} from '@/lib/public-api-handler';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the active weekly schedule of the tenant, optionally narrowed to one
 * branch (`sucursalId`) or to the branch a doctor belongs to (`medicoId`).
 *
 * `horarios_atencion` has no `medico_id` column: a `medicoId` is resolved to the
 * doctor's branch before filtering.
 * @param request
 */
async function handler(request: AuthenticatedRequest) {
  const tenantId = request.tenantId;
  const sucursalId = request.nextUrl.searchParams.get('sucursalId');
  const medicoId = request.nextUrl.searchParams.get('medicoId');

  const filters = [
    eq(horariosAtencion.activo, true),
    // Tenant scoping, with a fallback for legacy rows whose tenant column
    // still holds the placeholder value but whose branch belongs to the tenant.
    or(eq(horariosAtencion.tenantId, tenantId), eq(sucursales.tenantId, tenantId)) ??
      sql`false`,
  ];

  /** Branch the doctor belongs to, when `medicoId` was supplied. */
  let branchFromMedico: string | null = null;

  if (medicoId) {
    if (!UUID_RE.test(medicoId)) {
      return errorResponse('medicoId inválido', 400);
    }
    const [medico] = await db
      .select({ sucursalId: medicos.sucursalId, tenantId: sucursales.tenantId })
      .from(medicos)
      .leftJoin(sucursales, eq(medicos.sucursalId, sucursales.id))
      .where(eq(medicos.id, medicoId))
      .limit(1);

    if (!medico || (medico.tenantId && medico.tenantId !== tenantId)) {
      return errorResponse('Médico no encontrado', 404);
    }
    branchFromMedico = medico.sucursalId;
  }

  if (sucursalId) {
    if (!UUID_RE.test(sucursalId)) {
      return errorResponse('sucursalId inválido', 400);
    }
    filters.push(eq(horariosAtencion.sucursalId, sucursalId));
  } else if (medicoId) {
    if (!branchFromMedico) {
      return jsonResponse([]);
    }
    filters.push(eq(horariosAtencion.sucursalId, branchFromMedico));
  }

  const result = await db
    .select({
      dia: horariosAtencion.dia,
      horaInicio: horariosAtencion.inicio,
      horaFin: horariosAtencion.fin,
    })
    .from(horariosAtencion)
    .leftJoin(sucursales, eq(horariosAtencion.sucursalId, sucursales.id))
    .where(and(...filters));

  return jsonResponse(result);
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.HORARIOS_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
