import { NextRequest, NextResponse } from 'next/server';
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoria, datos, plantillaId } = body;

    if (!categoria && !plantillaId) {
      return NextResponse.json(
        { error: 'Se requiere categoria o plantillaId' },
        { status: 400 }
      );
    }

    // Buscar plantilla por ID o por categoría + activa
    let plantilla;
    if (plantillaId) {
      [plantilla] = await db
        .select()
        .from(plantillasMensajes)
        .where(
          and(
            eq(plantillasMensajes.id, plantillaId),
            isNull(plantillasMensajes.deletedAt)
          )
        )
        .limit(1);
    } else {
      [plantilla] = await db
        .select()
        .from(plantillasMensajes)
        .where(
          and(
            eq(plantillasMensajes.categoria, categoria),
            eq(plantillasMensajes.activa, true),
            isNull(plantillasMensajes.deletedAt)
          )
        )
        .limit(1);
    }

    if (!plantilla) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    // Reemplazar {{variables}} en el contenido
    let contenido = plantilla.contenido;
    if (datos && typeof datos === 'object') {
      for (const [key, value] of Object.entries(datos)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        contenido = contenido.replace(regex, String(value ?? ''));
      }
    }

    // También reemplazar variables declaradas pero no provistas con ''
    const variables = plantilla.variables || [];
    for (const varName of variables) {
      if (datos && !(varName in datos)) {
        const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'gi');
        contenido = contenido.replace(regex, '');
      }
    }

    return NextResponse.json({
      contenido,
      template: {
        id: plantilla.id,
        nombre: plantilla.nombre,
        categoria: plantilla.categoria,
        variables: plantilla.variables,
      },
    });
  } catch (error) {
    console.error('[Plantillas Populate]', error);
    return NextResponse.json(
      { error: 'Error al procesar plantilla' },
      { status: 500 }
    );
  }
}
