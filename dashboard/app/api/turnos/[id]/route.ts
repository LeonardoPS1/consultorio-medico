import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { parseBody } from '@/lib/validations';
import { updateTurnoSchema } from '@/lib/validations';
import { turnosService } from '@/lib/services/turnos';

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const body = await parseBody(request, updateTurnoSchema);
  const turno = await turnosService.update(params.id, body);
  return success(turno);
});
