import { NextRequest } from 'next/server';
import { alertasService } from '@/lib/services/alertas-inteligentes';
import { apiHandler, ok, fail } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

// GET /api/alertas?preview=true
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  if (searchParams.get('preview') === 'true') {
    const preview = await alertasService.previsualizar();
    return ok(preview);
  }

  fail('Especificá ?preview=true para previsualizar o POST para ejecutar');
});

// POST /api/alertas (ejecutar todas las alertas)
export const POST = apiHandler(async () => {
  const session = await requireAuth();
  const result = await alertasService.ejecutarTodasLasAlertas();
  return ok({ ...result, message: 'Alertas ejecutadas correctamente' });
});
