/**
 * GET  /api/turnos  -  Lista con filtros y stats
 * POST /api/turnos  -  Crea turno con validación de bloqueos
 * 
 * Refactorizado con: apiHandler + Zod + service layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, created } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { createTurnoSchema } from '@/lib/validations';
import { turnosService } from '@/lib/services/turnos';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pacientes, medicos } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { buildGCalPayload } from '@/lib/google-calendar-sync';

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  const sessionMedicoId = (session?.user as any)?.medicoId;
  const sessionRol = (session?.user as any)?.role;

  const { searchParams } = new URL(request.url);
  const fechaStr = searchParams.get('fecha') || undefined;
  const estado = searchParams.get('estado') || undefined;
  const medico = searchParams.get('medico') || undefined;
  const tipo = searchParams.get('tipo') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
  const sucursalId = searchParams.get('sucursalId') || undefined;

  const medicoIdFilter = sessionRol === 'medico' ? sessionMedicoId : undefined;
  const result = await turnosService.list(fechaStr, estado, medico, tipo, search, limit, offset, sucursalId, medicoIdFilter);
  return NextResponse.json(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, createTurnoSchema);
  const turno = await turnosService.create(body);

// El sync a Google Calendar ahora lo maneja turnosService.create()

  return created(turno);
});
