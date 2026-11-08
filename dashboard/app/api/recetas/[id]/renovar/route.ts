import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { NextRequest } from 'next/server';
import { medicos, pacientes } from '@/drizzle/core';
import { recetas } from '@/drizzle/schema';
import { sucursales } from '@/drizzle/tenant';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success, notFound, fail } from '@/lib/api-handler';
import { CACHE_TAGS, revalidate } from '@/lib/data-cache';
import { db } from '@/lib/db';
import { recetasService } from '@/lib/services/recetas';

/** Roles allowed to renew a prescription. Reception/staff are excluded. */
const ROLES_RENOVAR = new Set(['admin', 'medico']);

/** States that cannot be renewed. */
const ESTADOS_NO_RENOVABLES = ['anulada', 'renovada', 'historial'];

/**
 * Renews a prescription, creating a new one valid for 30 days.
 *
 * Authorization: only `admin` and `medico` inside the same tenant. A `medico` can
 * only renew prescriptions issued under their own `medicoId`; there is no implicit
 * allow when the session has no `medicoId`.
 */
export const POST = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    const session = await requireAuth();

    const rol = session?.user?.role;
    const tenantId = session?.user?.tenantId;
    const sessionMedicoId = session?.user?.medicoId;

    if (!rol || !ROLES_RENOVAR.has(rol)) {
      fail('No autorizado', 403);
    }

    const sucursalPaciente = alias(sucursales, 'sucursal_paciente');
    const sucursalMedico = alias(sucursales, 'sucursal_medico');

    const [existente] = await db
      .select({
        id: recetas.id,
        medicoId: recetas.medicoId,
        estado: recetas.estado,
        tenantPaciente: sucursalPaciente.tenantId,
        tenantMedico: sucursalMedico.tenantId,
      })
      .from(recetas)
      .leftJoin(pacientes, eq(recetas.pacienteId, pacientes.id))
      .leftJoin(sucursalPaciente, eq(pacientes.sucursalId, sucursalPaciente.id))
      .leftJoin(medicos, eq(recetas.medicoId, medicos.id))
      .leftJoin(sucursalMedico, eq(medicos.sucursalId, sucursalMedico.id))
      .where(eq(recetas.id, id))
      .limit(1);

    // A recipe that does not exist, or that belongs to another tenant, is reported
    // as not found so the caller cannot probe foreign ids.
    if (!existente) {
      notFound('Receta no encontrada');
    }

    const tenantReceta = existente.tenantMedico ?? existente.tenantPaciente ?? null;
    if (tenantReceta && tenantId && tenantReceta !== tenantId) {
      notFound('Receta no encontrada');
    }

    // A doctor may only renew their own prescriptions. Without a medicoId in the
    // session there is no ownership to prove, so the request is rejected.
    if (rol === 'medico') {
      if (!sessionMedicoId || existente.medicoId !== sessionMedicoId) {
        fail('No autorizado', 403);
      }
    }

    if (ESTADOS_NO_RENOVABLES.includes(existente.estado)) {
      fail('La receta no puede renovarse desde su estado actual', 400);
    }

    const renovada = await recetasService.renovar(id, sessionMedicoId ?? undefined);

    revalidate([CACHE_TAGS.RECETAS, CACHE_TAGS.PACIENTES, CACHE_TAGS.DASHBOARD_STATS]);
    return success(renovada);
  },
);
