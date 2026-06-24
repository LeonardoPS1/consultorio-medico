import { NextRequest } from 'next/server';
import { apiHandler, ok, fail, notFound } from '@/lib/api-handler';
import { parseBody, populatePlantillasSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { plantillasMensajes } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * POST /api/plantillas/populate
 *
 * Toma una categoría de plantilla + datos/variables y devuelve el contenido
 * con las variables reemplazadas. Usado por n8n para enviar mensajes
 * dinámicos basados en plantillas editables desde el dashboard.
 *
 * Body:
 *   { categoria: "recordatorio_24h", datos: { nombre: "Juan", fecha_hora: "...", medico_nombre: "..." } }
 *
 * Response:
 *   { contenido: "Hola Juan! Tu turno es el ...", template: { id, nombre, categoria } }
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = await parseBody(request, populatePlantillasSchema);
  const { categoria, datos, plantillaId } = body;

  if (!categoria && !plantillaId) {
    fail('Se requiere categoria o plantillaId', 400);
  }

  const fetchPlantilla = async () => {
    if (plantillaId) {
      const [p] = await db
        .select()
        .from(plantillasMensajes)
        .where(and(eq(plantillasMensajes.id, plantillaId), isNull(plantillasMensajes.deletedAt)))
        .limit(1);
      return p;
    }
    const [p] = await db
      .select()
      .from(plantillasMensajes)
      .where(
        and(
          eq(plantillasMensajes.categoria, categoria!),
          eq(plantillasMensajes.activa, true),
          isNull(plantillasMensajes.deletedAt),
        ),
      )
      .limit(1);
    return p;
  };

  const plantilla = await fetchPlantilla();
  if (!plantilla) notFound('Plantilla no encontrada');

  let contenido = plantilla.contenido;
  if (datos && typeof datos === 'object') {
    for (const [key, value] of Object.entries(datos)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      contenido = contenido.replace(regex, String(value ?? ''));
    }
  }

  const variables = plantilla.variables || [];
  for (const varName of variables) {
    if (datos && !(varName in datos)) {
      const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'gi');
      contenido = contenido.replace(regex, '');
    }
  }

  return ok({
    contenido,
    template: {
      id: plantilla.id,
      nombre: plantilla.nombre,
      categoria: plantilla.categoria,
      variables: plantilla.variables,
    },
  });
});
