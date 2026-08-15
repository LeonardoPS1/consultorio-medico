import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, created } from '@/lib/api-handler';
import { waitlistService } from '@/lib/services/waitlist';

const crearOfertaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('turno'), turnoId: z.string().uuid('turnoId debe ser UUID') }),
  z.object({
    tipo: z.literal('franja'),
    fechaHora: z.string().min(1, 'fechaHora es requerida'),
    pacienteId: z.string().uuid('pacienteId debe ser UUID'),
    medicoId: z.string().uuid('medicoId debe ser UUID'),
  }),
]);

/**
 * POST /api/waitlist/[id]/oferta - Crea una oferta manual para un paciente en espera.
 *
 * Body: `{ tipo: 'turno', turnoId }` para ofrecer un turno existente, o
 * `{ tipo: 'franja', fechaHora, pacienteId, medicoId }` para crear un turno
 * nuevo en una franja libre del médico.
 */
export const POST = apiHandler(
  async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const body = (await request.json()) as unknown;
    const parsed = crearOfertaSchema.parse(body);
    const oferta =
      parsed.tipo === 'turno'
        ? await waitlistService.crearOferta(id, parsed.turnoId)
        : await waitlistService.crearOferta(id, {
            fechaHora: new Date(parsed.fechaHora),
            pacienteId: parsed.pacienteId,
            medicoId: parsed.medicoId,
          });
    return created(oferta);
  },
);
