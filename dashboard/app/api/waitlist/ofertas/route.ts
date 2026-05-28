import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { waitlistService } from '@/lib/services/waitlist';

/**
 * GET /api/waitlist/ofertas - Lista ofertas de turno
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const listaEsperaId = searchParams.get('listaEsperaId') || undefined;
  const estado = searchParams.get('estado') || undefined;

  const items = await waitlistService.listarOfertas(listaEsperaId, estado);
  return success(items);
});
