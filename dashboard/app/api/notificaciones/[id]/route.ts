import { NextRequest } from 'next/server';
import { notificacionesService } from '@/lib/services/notificaciones';
import { apiHandler, ok, notFound } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { parseBody, updateNotificacionSchema } from '@/lib/validations';

// ─── PATCH /api/notificaciones/[id] ─────────────────────────
export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await requireAuth();
  const userId = session.user.id as string;
  const { action } = await parseBody(request, updateNotificacionSchema);

  try {
    if (action === 'read') {
      await notificacionesService.marcarLeida(params.id, userId);
      return ok({ success: true });
    }

    await notificacionesService.marcarNoLeida(params.id, userId);
    return ok({ success: true });
  } catch (error: any) {
    if (error?.message?.includes?.('No encontrada') || error?.digest?.includes?.('NOT_FOUND')) {
      notFound('Notificación no encontrada');
    }
    throw error;
  }
});

// ─── DELETE /api/notificaciones/[id] ────────────────────────
export const DELETE = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  try {
    await notificacionesService.eliminar(params.id, userId);
    return ok({ success: true });
  } catch (error: any) {
    if (error?.message?.includes?.('No encontrada') || error?.digest?.includes?.('NOT_FOUND')) {
      notFound('Notificación no encontrada');
    }
    throw error;
  }
});
