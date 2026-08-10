'use server';

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success } from '@/lib/api-handler';
import { waitlistService } from '@/lib/services/waitlist';

// GET /api/waitlist/turnos-disponibles?medicoId=xxx
export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const medicoId = searchParams.get('medicoId');

  if (!medicoId) {
    return success([]);
  }

  const turnos = await waitlistService.turnosDisponibles(medicoId);
  return success(turnos);
});
