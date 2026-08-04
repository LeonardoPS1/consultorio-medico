import { isNull } from 'drizzle-orm';
import { medicos } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { API_SCOPES } from '@/lib/public-api-auth';
import { publicApiHandler, jsonResponse } from '@/lib/public-api-handler';

async function handler() {
  const result = await db
    .select({
      id: medicos.id,
      nombre: medicos.nombre,
      especialidad: medicos.especialidad,
      email: medicos.email,
      telefono: medicos.telefono,
    })
    .from(medicos)
    .where(isNull(medicos.deletedAt));

  return jsonResponse(result);
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.MEDICOS_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
