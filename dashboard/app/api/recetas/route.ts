import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { recetasService } from '@/lib/services/recetas';
import { apiHandler, created, notFound } from '@/lib/api-handler';
import { parseBody, parseQuery, createRecetaSchema } from '@/lib/validations';
import { z } from 'zod';

const recetasQuerySchema = z.object({
  estado: z.string().optional(),
  limit: z.coerce.number().optional().default(100),
  offset: z.coerce.number().optional().default(0),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;
  const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

  const { estado, limit, offset } = parseQuery(request, recetasQuerySchema);

  const result = await recetasService.listar({
    estado,
    limit,
    offset,
    medicoId: isMedico ? sessionMedicoId : null,
  });

  return NextResponse.json(result);
});

const recetaBodySchema = createRecetaSchema.extend({
  presentacion: z.string().optional().nullable(),
  cantidadTotal: z.string().optional().nullable(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, recetaBodySchema);
  const { pacienteId, medicamento, dosis, frecuencia, duracion, indicaciones, presentacion, cantidadTotal, medicoId } = body;

  const paciente = await db
    .select({ id: pacientes.id })
    .from(pacientes)
    .where(and(eq(pacientes.id, pacienteId), sql`${pacientes.deletedAt} IS NULL`))
    .limit(1);

  if (paciente.length === 0) {
    notFound('Paciente no encontrado');
  }

  let medicoFinal = medicoId;
  if (!medicoFinal) {
    const session = await auth();
    const sessionMedicoId = session?.user?.medicoId;
    const sessionRol = session?.user?.role;
    if (sessionRol === 'medico' && sessionMedicoId) {
      medicoFinal = sessionMedicoId;
    } else {
      const primerMedico = await db
        .select({ id: medicos.id })
        .from(medicos)
        .where(sql`${medicos.deletedAt} IS NULL`)
        .limit(1);
      if (primerMedico.length > 0) {
        medicoFinal = primerMedico[0].id;
      }
    }
  }

  const nueva = await recetasService.crear({
    pacienteId,
    medicamento,
    dosis,
    frecuencia,
    duracion,
    indicaciones,
    presentacion,
    cantidadTotal,
    medicoId: medicoFinal,
  });

  return created(nueva);
});
