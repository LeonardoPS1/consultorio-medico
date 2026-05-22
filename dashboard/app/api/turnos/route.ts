/**
 * GET  /api/turnos  -  Lista con filtros y stats
 * POST /api/turnos  -  Crea turno con validación de bloqueos
 * 
 * Refactorizado con: apiHandler + Zod + service layer
 */

import { NextRequest } from 'next/server';
import { apiHandler, success, created } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { createTurnoSchema } from '@/lib/validations';
import { turnosService } from '@/lib/services/turnos';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const fechaStr = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
  const estado = searchParams.get('estado') || undefined;
  const medico = searchParams.get('medico') || undefined;
  const tipo = searchParams.get('tipo') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

  const result = await turnosService.list(fechaStr, estado, medico, tipo, search, limit, offset);
  return success(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, createTurnoSchema);
  const turno = await turnosService.create(body);
  return created(turno);
});
