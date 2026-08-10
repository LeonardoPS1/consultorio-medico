'use server';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { waitlistService } from '@/lib/services/waitlist';

const reasignarSchema = z.object({
  ofertaId: z.string().uuid(), // ID de la oferta creada
});

// POST /api/waitlist/reasignar
export const POST = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const body = await request.json();
  const parsed = reasignarSchema.parse(body);

  try {
    const result = await waitlistService.aceptar(parsed.ofertaId);
    return ok({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al reasignar turno';
    fail(msg, 400);
  }
});
