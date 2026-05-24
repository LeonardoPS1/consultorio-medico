import { NextRequest, NextResponse } from 'next/server';
import { getSurveyStats, storeSurveyResponse } from '@/lib/encuestas';

/**
 * GET /api/encuestas
 *
 * Obtiene estadísticas reales de encuestas desde la DB (historial_medico).
 */
export async function GET() {
  try {
    const stats = await getSurveyStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('[API] Error GET /api/encuestas:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}

/**
 * POST /api/encuestas
 *
 * Registra una respuesta de encuesta de un paciente.
 * Body: { pacienteId, turnoId?, puntaje, comentario? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pacienteId, turnoId, puntaje, comentario } = body;

    if (!pacienteId) {
      return NextResponse.json({ error: 'pacienteId requerido' }, { status: 400 });
    }
    if (puntaje === undefined || puntaje < 1 || puntaje > 5) {
      return NextResponse.json({ error: 'puntaje debe ser 1-5' }, { status: 400 });
    }

    const ok = await storeSurveyResponse({ pacienteId, turnoId, puntaje, comentario });

    if (!ok) {
      return NextResponse.json({ error: 'Error al registrar encuesta' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { pacienteId, puntaje, comentario, registrada: new Date().toISOString() },
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/encuestas:', error);
    return NextResponse.json({ error: 'Error al registrar encuesta' }, { status: 500 });
  }
}
