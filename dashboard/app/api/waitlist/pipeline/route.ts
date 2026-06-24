/**
 * POST /api/waitlist/pipeline
 *
 * Endpoint interno para que n8n (WF-10) ejecute el pipeline de expiración
 * de ofertas de turno cada 5 minutos.
 *
 * Flujo:
 * 1. Marca ofertas pendientes vencidas como 'expirada'
 * 2. Para cada turno con oferta vencida, busca el siguiente candidato
 * 3. Crea nueva oferta y notifica al paciente
 *
 * @returns { expiradas, nuevasOfertas, ofertas[] }
 */

import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { waitlistService } from '@/lib/services/waitlist';
import { verifyRequestSecret } from '@/lib/verify-webhook-secret';
import { withRateLimit } from '@/lib/rate-limit';

const postHandler = apiHandler(async (request: NextRequest) => {
  // Verificar webhook secret (timing-safe)
  if (!verifyRequestSecret(request)) {
    return success({ error: 'No autorizado' }, 401);
  }

  const results = await waitlistService.ejecutarPipeline();

  return success({
    ...results,
    mensaje:
      results.expiradas > 0
        ? `${results.expiradas} oferta(s) expirada(s), ${results.nuevasOfertas} nueva(s) oferta(s) creada(s)`
        : 'No hay ofertas pendientes por expirar',
  });
});

// n8n ejecuta pipeline cada 5 min — rate limit generoso como safety net
export const POST = withRateLimit(postHandler, { maxRequests: 30, windowMs: 60_000 });
