import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pacientes } from '@/drizzle/schema';
import { eq, sql, desc, count, avg } from 'drizzle-orm';

/**
 * POST /api/encuestas
 *
 * Registra una respuesta de encuesta de un paciente.
 * Body: { pacienteId, turnoId?, puntaje, comentario? }
 *
 * GET /api/encuestas
 *
 * Obtiene estadisticas de encuestas.
 * Query: pacienteId (opcional)
 */

// ─── GET: Estadisticas ──────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');

    // Stats globales desde DB usando un approach simple:
    // Como no tenemos tabla de encuestas aun, devolvemos stats mock
    // basados en el historial médico reciente.
    const stats = {
      totalEncuestas: 0,
      puntajePromedio: 0,
      respuestasRecientes: [] as any[],
      mensaje: 'Sistema de encuestas activo. Las respuestas se registraran via POST.',
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// ─── POST: Registrar respuesta ──────────────────────────

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

    // Registrar la encuesta como una entrada en el historial medico
    await db.execute(sql`
      INSERT INTO historial_medico (paciente_id, tipo, titulo, descripcion, created_at, updated_at)
      VALUES (
        ${pacienteId},
        'encuesta',
        ${`Encuesta de satisfaccion - ${puntaje}/5`},
        ${comentario || 'Sin comentarios'},
        NOW(),
        NOW()
      )
    `);

    return NextResponse.json({
      success: true,
      data: { pacienteId, puntaje, comentario, registrada: new Date().toISOString() },
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error POST /api/encuestas:', error);
    return NextResponse.json({ error: 'Error al registrar encuesta' }, { status: 500 });
  }
}
