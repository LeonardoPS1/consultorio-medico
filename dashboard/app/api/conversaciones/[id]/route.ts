import { NextRequest, NextResponse } from 'next/server';
import { getConversacionById } from '@/lib/data-store';

/**
 * GET /api/conversaciones/[id]
 *
 * Obtiene una conversación por ID, incluyendo datos del paciente.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de conversación es obligatorio' },
        { status: 400 }
      );
    }

    const conversacion = await getConversacionById(id);

    if (!conversacion) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversacion);
  } catch (error) {
    console.error('[API] Error GET /api/conversaciones/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener conversación', details: (error as Error).message },
      { status: 500 }
    );
  }
}
