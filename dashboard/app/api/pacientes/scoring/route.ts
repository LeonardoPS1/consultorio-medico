import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { apiHandler, ok } from '@/lib/api-handler';
import { calcularScorePaciente, calcularTodosLosScores } from '@/lib/services/scoring-pacientes';

// GET /api/pacientes/scoring?ids=id1,id2,id3  — scoring para pacientes específicos
// GET /api/pacientes/scoring  — scoring para todos los pacientes
export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');

  if (idsParam) {
    const ids = idsParam.split(',').filter(Boolean);
    const scores = await Promise.all(
      ids.map((id) => calcularScorePaciente(id).then((s) => ({ ...s, pacienteId: id }))),
    );
    return ok({ scores });
  }

  const scores = await calcularTodosLosScores();
  return ok({ scores: scores ?? [] });
});
