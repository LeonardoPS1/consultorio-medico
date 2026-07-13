import { NextRequest } from 'next/server';
import { apiHandler, success, created } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { waitlistService } from '@/lib/services/waitlist';
import { z } from 'zod';

const crearOfertaSchema = z.object({
  turnoId: z.string().uuid('turnoId debe ser UUID'),
});

/**
 * POST /api/waitlist/[id]/oferta - Crea una oferta manual para un paciente en espera
 */
export const POST = apiHandler(
  async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const { id } = await paramsPromise;
    await requireAuth();
    const body = await request.json();
    const parsed = crearOfertaSchema.parse(body);
    const oferta = await waitlistService.crearOferta(id, parsed.turnoId);
    return created(oferta);
  },
);
