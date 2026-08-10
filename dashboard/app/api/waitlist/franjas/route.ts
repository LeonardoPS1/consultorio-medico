'use server';

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, success } from '@/lib/api-handler';
import { formatearFechaHora, proximasFranjasLibres } from '@/lib/services/waitlist';

// GET /api/waitlist/franjas?medicoId=xxx&dias=7&limite=15
export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const medicoId = searchParams.get('medicoId');

  if (!medicoId) {
    return success([]);
  }

  const dias = Number(searchParams.get('dias')) || 7;
  const limite = Number(searchParams.get('limite')) || 15;
  const franjas = await proximasFranjasLibres(medicoId, { dias, limite });

  return success(
    franjas.map((f) => {
      const { fecha, hora } = formatearFechaHora(f.fechaHora);
      return {
        fechaHora: f.fechaHora.toISOString(),
        fecha,
        hora,
        duracionMinutos: f.duracionMinutos,
      };
    }),
  );
});
