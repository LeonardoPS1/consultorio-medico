import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSurveyStats, storeSurveyResponse } from '@/lib/encuestas';

const encuestaSchema = z.object({
  pacienteId: z.string().uuid(),
  medicoId: z.string().uuid().optional(),
  turnoId: z.string().uuid().optional(),
  puntaje: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
});

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
    const parsed = encuestaSchema.parse(body);

    const ok = await storeSurveyResponse({
      pacienteId: parsed.pacienteId,
      medicoId: parsed.medicoId,
      turnoId: parsed.turnoId,
      puntaje: parsed.puntaje,
      comentario: parsed.comentario,
    });

    if (!ok) {
      return NextResponse.json({ error: 'Error al registrar encuesta' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          pacienteId: parsed.pacienteId,
          puntaje: parsed.puntaje,
          comentario: parsed.comentario,
          registrada: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] Error POST /api/encuestas:', error);
    return NextResponse.json({ error: 'Error al registrar encuesta' }, { status: 500 });
  }
}
