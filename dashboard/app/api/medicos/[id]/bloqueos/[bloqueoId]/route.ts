import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bloqueosAgenda } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/medicos/[id]/bloqueos/[bloqueoId]
 *
 * Elimina un bloqueo de agenda.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; bloqueoId: string } },
) {
  try {
    const result = await db
      .delete(bloqueosAgenda)
      .where(
        and(
          eq(bloqueosAgenda.id, params.bloqueoId),
          eq(bloqueosAgenda.medicoId, params.id),
        ),
      );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Bloqueo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error DELETE bloqueo:', error);
    return NextResponse.json({ error: 'Error al eliminar bloqueo' }, { status: 500 });
  }
}
