/**
 * GET   /api/pacientes/[id]        -  Detalle del paciente
 * PATCH /api/pacientes/[id]        -  Actualizar notas, alergias, etc.
 * 
 * Refactorizado: usa Drizzle DB en vez de patient-store.ts (JSON)
 * Seguridad: IDOR check — verifica que el paciente pertenezca al médico autenticado
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, fail, notFound } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { updatePacienteSchema } from '@/lib/validations';
import { pacientesService } from '@/lib/services/pacientes';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pacientes, turnos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

// Helper: verifica que el médico tenga acceso a este paciente
async function verifyPacienteAccess(pacienteId: string, medicoId: string | undefined, rol: string | undefined): Promise<void> {
  if (rol === 'admin') return; // admin puede ver todo
  if (!medicoId) throw new Error('No autorizado');

  // Verificar que el médico tenga al menos un turno con este paciente
  const [relation] = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(and(
      eq(turnos.pacienteId, pacienteId),
      eq(turnos.medicoId, medicoId),
      sql`${turnos.deletedAt} IS NULL`,
    ))
    .limit(1);

  if (!relation) {
    throw new Error('No autorizado — el paciente no pertenece a tu consulta');
  }
}

export const GET = apiHandler(async (_req: NextRequest, { params }) => {
  const session = await auth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);

  const [paciente] = await db
    .select({
      id: pacientes.id, nombre: pacientes.nombre, apellido: pacientes.apellido,
      telefono: pacientes.telefono, email: pacientes.email, dni: pacientes.dni,
      fechaNacimiento: pacientes.fechaNacimiento, direccion: pacientes.direccion,
      obraSocial: pacientes.obraSocial, numeroAfiliado: pacientes.numeroAfiliado,
      sistemaSalud: pacientes.sistemaSalud, isapreNombre: pacientes.isapreNombre,
      regionId: pacientes.regionId, comunaId: pacientes.comunaId,
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
  const session = await auth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);

  const body = await parseBody(request, updatePacienteSchema);
  const updated = await pacientesService.update(params.id, body);
  return success(updated);
});

export const DELETE = apiHandler(async (_req: NextRequest, { params }) => {
  const session = await auth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;

  await verifyPacienteAccess(params.id, sessionMedicoId, sessionRol);

  const result = await pacientesService.delete(params.id);
  return success(result);
});
