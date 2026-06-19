import { NextRequest } from 'next/server';
import { calcularScorePaciente, calcularTodosLosScores } from '@/lib/services/scoring-pacientes';
import { apiHandler, ok } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';

// GET /api/pacientes/scoring?ids=id1,id2,id3  — scoring para pacientes específicos
// GET /api/pacientes/scoring  — scoring para todos los pacientes
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
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
