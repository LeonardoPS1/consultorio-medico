import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { medicos } from '@/drizzle/schema';
import { medicosService } from '@/lib/services/medicos';
import { apiHandler, created } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, parseQuery, createMedicoSchema } from '@/lib/validations';
import { z } from 'zod';

const medicosQuerySchema = z.object({
  sucursalId: z.string().optional(),
});

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const { sucursalId } = parseQuery(request, medicosQuerySchema);

  const result = await medicosService.list(sucursalId);
  return NextResponse.json(result);
});

const medicoBodySchema = createMedicoSchema.extend({
  horarios: z.record(z.unknown()).optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const body = await parseBody(request, medicoBodySchema);
  const {
    nombre,
    especialidad,
    email,
    telefono,
    whatsapp,
    matricula,
    duracionTurnoMinutos,
    horarios,
  } = body;

  const [nuevo] = await db
    .insert(medicos)
    .values({
      nombre: nombre.trim(),
      especialidad: especialidad.trim(),
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      matricula: matricula?.trim() || null,
      duracionTurnoMinutos: duracionTurnoMinutos || 30,
      horarios: horarios || {},
      activo: true,
    })
    .returning();

  medicosService.invalidate();

  return created(nuevo);
});
