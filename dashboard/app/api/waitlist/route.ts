import { NextRequest } from 'next/server';
import { apiHandler, success, created } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { waitlistService } from '@/lib/services/waitlist';
import { z } from 'zod';

const agregarSchema = z.object({
  pacienteId: z.string().uuid('pacienteId debe ser UUID'),
  medicoId: z.string().uuid('medicoId debe ser UUID'),
  notas: z.string().optional().nullable(),
  sucursalId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/waitlist - Lista inscripciones en lista de espera
 */
export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const medicoId = searchParams.get('medicoId') || undefined;
  const estado = searchParams.get('estado') || undefined;

  const items = await waitlistService.listar(medicoId, estado);
  return success(items);
});

/**
 * POST /api/waitlist - Agrega paciente a lista de espera
 */
export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();

  const body = await parseBody(request, agregarSchema);
  const item = await waitlistService.agregar(
    body.pacienteId,
    body.medicoId,
    body.notas || undefined,
    body.sucursalId || undefined,
  );
  return created(item);
});
