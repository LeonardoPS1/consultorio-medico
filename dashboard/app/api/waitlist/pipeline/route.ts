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

export const POST = apiHandler(async (request: NextRequest) => {
  // Verificar webhook secret
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return success({ error: 'No autorizado' }, 401);
  }

  const results = await waitlistService.ejecutarPipeline();

  return success({
    ...results,
    mensaje: results.expiradas > 0
      ? `${results.expiradas} oferta(s) expirada(s), ${results.nuevasOfertas} nueva(s) oferta(s) creada(s)`
      : 'No hay ofertas pendientes por expirar',
  });
});
