import { eq, and, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pacientes, medicos } from '@/drizzle/schema';
import { apiHandler, created, notFound } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { CACHE_TAGS, revalidate } from '@/lib/data-cache';
import { db } from '@/lib/db';
import { recetasService } from '@/lib/services/recetas';
import { parseBody, parseQuery, createRecetaSchema } from '@/lib/validations';

const recetasQuerySchema = z.object({
  estado: z.enum(['activa', 'vencida', 'historial']).optional(),
  limit: z.coerce.number().optional().default(100),
  offset: z.coerce.number().optional().default(0),
  pacienteId: z.string().uuid().optional(),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const sessionMedicoId = session?.user?.medicoId;
  const sessionRol = session?.user?.role;
  const isMedico = sessionRol === 'medico' && !!sessionMedicoId;

  const { estado, limit, offset, pacienteId } = parseQuery(request, recetasQuerySchema);

  const result = await recetasService.listar({
    estado,
    limit,
    offset,
    pacienteId: pacienteId ?? null,
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
  const {
    pacienteId,
    medicamento,
    dosis,
    frecuencia,
    duracion,
    indicaciones,
    presentacion,
    cantidadTotal,
    medicoId,
  } = body;

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

  revalidate([CACHE_TAGS.RECETAS, CACHE_TAGS.DASHBOARD_STATS]);
  return created(nueva);
});
