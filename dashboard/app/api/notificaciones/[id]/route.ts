import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { notificacionesService } from '@/lib/services/notificaciones';

// ─── PATCH /api/notificaciones/[id] ─────────────────────────
// Body: { action: 'read' } | { action: 'unread' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'read') {
      await notificacionesService.marcarLeida(params.id, session.user.id);
      return NextResponse.json({ success: true });
    }

    if (action === 'unread') {
      await notificacionesService.marcarNoLeida(params.id, session.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida. Usar "read" o "unread"' }, { status: 400 });
  } catch (error: any) {
    if (error?.message?.includes?.('No encontrada') || error?.digest?.includes?.('NOT_FOUND')) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }
    console.error('[Notificaciones PATCH]', error);
    return NextResponse.json({ error: 'Error al actualizar notificación' }, { status: 500 });
  }
}

// ─── DELETE /api/notificaciones/[id] ────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await notificacionesService.eliminar(params.id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes?.('No encontrada') || error?.digest?.includes?.('NOT_FOUND')) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }
    console.error('[Notificaciones DELETE]', error);
    return NextResponse.json({ error: 'Error al eliminar notificación' }, { status: 500 });
  }
}
