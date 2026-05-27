/**
 * GET   /api/pacientes/[id]        -  Detalle del paciente
 * PATCH /api/pacientes/[id]        -  Actualizar notas, alergias, etc.
 * 
 * Refactorizado: usa Drizzle DB en vez de patient-store.ts (JSON)
 */

import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { updatePacienteSchema } from '@/lib/validations';
import { pacientesService } from '@/lib/services/pacientes';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export const GET = apiHandler(async (_req: NextRequest, { params }) => {
  const [paciente] = await db
    .select({
      id: pacientes.id, nombre: pacientes.nombre, apellido: pacientes.apellido,
      telefono: pacientes.telefono, email: pacientes.email, dni: pacientes.dni,
      fechaNacimiento: pacientes.fechaNacimiento, direccion: pacientes.direccion,
      obraSocial: pacientes.obraSocial, numeroAfiliado: pacientes.numeroAfiliado,
      alergias: pacientes.alergias, medicacionCronica: pacientes.medicacionCronica,
      notasMedicas: pacientes.notasMedicas, tags: pacientes.tags,
      consentimientoWhatsapp: pacientes.consentimientoWhatsapp,
      createdAt: pacientes.createdAt,
    })
    .from(pacientes)
    .where(and(eq(pacientes.id, params.id), sql`${pacientes.deletedAt} IS NULL`));

  if (!paciente) return success(null, 404);
  return success(paciente);
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const body = await parseBody(request, updatePacienteSchema);
  const updated = await pacientesService.update(params.id, body);
  return success(updated);
});

export const DELETE = apiHandler(async (_req: NextRequest, { params }) => {
  const result = await pacientesService.delete(params.id);
  return success(result);
});
