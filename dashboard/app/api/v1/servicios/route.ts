import { servicios } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { API_SCOPES } from '@/lib/public-api-auth';
import { publicApiHandler, jsonResponse } from '@/lib/public-api-handler';

async function handler() {
  const result = await db
    .select({
      id: servicios.id,
      nombre: servicios.nombre,
      descripcion: servicios.descripcion,
      duracionMinutos: servicios.duracionMinutos,
      precio: servicios.precio,
    })
    .from(servicios);

  return jsonResponse(result);
}

export const GET = publicApiHandler(handler, {
  scopes: [API_SCOPES.SERVICIOS_READ],
});

export { OPTIONS } from '@/lib/public-api-handler';
