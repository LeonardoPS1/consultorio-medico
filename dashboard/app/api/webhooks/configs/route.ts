import { NextRequest } from 'next/server';
import { webhooksService } from '@/lib/services/webhooks';
import { apiHandler, success, created, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody } from '@/lib/validations';
import { z } from 'zod';

const createWebhookSchema = z.object({
  evento: z.enum([
    'turno.creado',
    'turno.actualizado',
    'turno.cancelado',
    'paciente.creado',
    'paciente.actualizado',
    'receta.creada',
    'derivacion.creada',
    'derivacion.actualizada',
    'pago.completado',
  ]),
  url: z.string().url('URL inválida'),
  activo: z.boolean().optional().default(true),
});

// GET /api/webhooks/configs
export const GET = apiHandler(async () => {
  const session = await requireAuth();
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) fail('Tenant no encontrado', 400);
  const configs = await webhooksService.list(tenantId);
  return ok({ data: configs });
});

// POST /api/webhooks/configs
export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const tenantId = (session.user as { tenantId?: string }).tenantId;
  if (!tenantId) fail('Tenant no encontrado', 400);
  const body = await parseBody(request, createWebhookSchema);
  const nuevo = await webhooksService.create({ ...body, tenantId });
  return created(nuevo);
});
