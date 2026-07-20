import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { actualizarScoresTurnosProximos } from '@/lib/services/scoring-pacientes';

/**
 * POST /api/internal/scores/actualizar - Endpoint interno para job nocturno de actualización de scores
 * Requiere header x-internal-key válido
 */
export const POST = apiHandler(async (request: NextRequest) => {
  // Validar clave interna
  const internalKey = request.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  if (!expectedKey || internalKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const sucursalId = body.sucursalId;
  const diasAntelacion = body.diasAntelacion ?? 30;

  const resultado = await actualizarScoresTurnosProximos({ sucursalId, diasAntelacion });

  return success({
    mensaje: `Scores actualizados: ${resultado.actualizados} turnos, ${resultado.errores} errores`,
    ...resultado,
  });
});