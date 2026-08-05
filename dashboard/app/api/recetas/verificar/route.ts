import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, or, gte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { pacientes, recetas, recetaEstadoEnum } from '@/drizzle/schema';
import { apiHandler } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyPacienteAccess } from '@/lib/api-auth';
import { verificarReceta } from '@/lib/farmaco-interacciones';
import { canAccess } from '@/lib/features';
import { getHoyISO } from '@/lib/receta-utils';

const verificarSchema = z.object({
  pacienteId: z.string().uuid(),
  medicamento: z.string().min(1).max(255),
});

/**
 * GET /api/recetas/verificar?pacienteId=&medicamento=
 * Verifica alergias e interacciones con recetas vigentes antes de prescribir.
 * Fail-open: si el plan no habilita la feature o no hay coincidencias → { alertas: [] }.
 * Nunca bloquea por sí mismo; es una ALERTA que el médico confirma.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const plan = (session?.user as { plan?: string } | undefined)?.plan;
  if (!canAccess(plan, 'alertas-interacciones')) {
    return NextResponse.json({ alertas: [] });
  }

  const parsed = verificarSchema.parse({
    pacienteId: request.nextUrl.searchParams.get('pacienteId'),
    medicamento: request.nextUrl.searchParams.get('medicamento'),
  });

  await verifyPacienteAccess(parsed.pacienteId, session?.user?.medicoId, session?.user?.role);

  const [paciente] = await db
    .select({ alergias: pacientes.alergias })
    .from(pacientes)
    .where(eq(pacientes.id, parsed.pacienteId))
    .limit(1);

  if (!paciente) {
    return NextResponse.json({ alertas: [] });
  }

  const hoy = getHoyISO();
  const estadosActivos = [recetaEstadoEnum.enumValues[0], recetaEstadoEnum.enumValues[1], recetaEstadoEnum.enumValues[2]] as const;
  const activas = await db
    .select({ medicamento: recetas.medicamento })
    .from(recetas)
    .where(
      and(
        eq(recetas.pacienteId, parsed.pacienteId),
        sql`${recetas.estado} IN (${estadosActivos[0]}::receta_estado, ${estadosActivos[1]}::receta_estado, ${estadosActivos[2]}::receta_estado)`,
        or(isNull(recetas.fechaFin), gte(recetas.fechaFin, hoy)),
      ),
    );

  const alertas = verificarReceta({
    medicamento: parsed.medicamento,
    alergias: paciente.alergias,
    medicamentosActivos: activas.map((r) => r.medicamento),
  });

  return NextResponse.json({ alertas });
});