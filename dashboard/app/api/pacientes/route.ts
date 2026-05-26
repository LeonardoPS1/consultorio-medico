/**
 * GET /api/pacientes  -  Lista con búsqueda y stats
 * POST /api/pacientes -  Crea paciente
 * 
 * Refactorizado con: apiHandler + Zod + service layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, created } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { createPacienteSchema } from '@/lib/validations';
import { pacientesService } from '@/lib/services/pacientes';

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
  const sucursalId = searchParams.get('sucursalId') || undefined;

  const result = await pacientesService.list(search, limit, offset, sucursalId);
  return NextResponse.json(result);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, createPacienteSchema);
  const paciente = await pacientesService.create(body);
  return created(paciente);
});
