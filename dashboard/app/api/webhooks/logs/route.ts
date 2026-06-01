import { NextRequest, NextResponse } from 'next/server';
import { getMensajes } from '@/lib/data-store';
import { auth } from '@/lib/auth';

/**
 * GET /api/webhooks/logs
 *
 * Devuelve el historial de mensajes entrantes/salientes con estados de Twilio.
 * Ideal para el dashboard de monitoreo de webhooks y logs.
 *
 * Query params:
 *   - estado: filtrar por twilioStatus (received, queued, sent, delivered, read, failed, undelivered)
 *   - desde: fecha ISO (YYYY-MM-DD) para filtrar desde
 *   - hasta: fecha ISO (YYYY-MM-DD) para filtrar hasta
 *   - search: búsqueda en contenido del mensaje o nombre del paciente
 *   - limit: cantidad de resultados (default 50, max 200)
 *   - offset: paginación
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;
    const desde = searchParams.get('desde') || undefined;
    const hasta = searchParams.get('hasta') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getMensajes({
      twilioStatus: estado,
      desde,
      hasta,
      search,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.mensajes,
      total: result.total,
      porEstado: result.porEstado,
      pagination: {
        limit,
        offset,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
        currentPage: Math.floor(offset / limit) + 1,
      },
    });
  } catch (error) {
    console.error('[Webhooks Logs] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener logs de webhooks',
        ...(process.env.NODE_ENV === 'development' ? { details: (error as Error).message } : {}),
      },
      { status: 500 }
    );
  }
}
