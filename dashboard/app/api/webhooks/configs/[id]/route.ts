import { NextRequest } from 'next/server';
import { webhooksService } from '@/lib/services/webhooks';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { z } from 'zod';

const updateWebhookSchema = z.object({
  url: z.string().url('URL inválida').optional(),
  evento: z
    .enum([
      'turno.creado',
      'turno.actualizado',
      'turno.cancelado',
      'paciente.creado',
      'paciente.actualizado',
      'receta.creada',
      'derivacion.creada',
      'derivacion.actualizada',
      'pago.completado',
    ])
    .optional(),
  activo: z.boolean().optional(),
});

// GET /api/webhooks/configs/[id]
export const GET = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const config = await webhooksService.getById(id);
    return ok({ data: config });
  },
);

// PATCH /api/webhooks/configs/[id]
export const PATCH = apiHandler(
  async (request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const body = await parseBody(request, updateWebhookSchema);
    const updated = await webhooksService.update(id, body);
    return ok({ data: updated });
  },
);

// DELETE /api/webhooks/configs/[id]
export const DELETE = apiHandler(
  async (_request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) => {
    const { id } = await paramsPromise;
    await requireAuth();
    const result = await webhooksService.eliminar(id);
    return ok(result);
  },
);
